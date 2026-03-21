import axios from "axios";
import fs from "fs/promises";
import PQueue from "p-queue";
import { PDFParse } from "pdf-parse";

import { runOCR } from "../lib/ocr";
import { createConverter, pdfPageToImage } from "../utils/pdfToPic";
import sharp from "sharp";
import { cleanOCR } from "../utils/cleanOCR";

// 🔥 global queue
const globalQueue = new PQueue({ concurrency: 5 });

// 🔥 cache
const pdfCache = new Map<string, string>();

export function isScanned(text: string) {
    const clean = text.trim();

    const words = clean.split(/\s+/).length;
    const alphaChars = (clean.match(/[\p{L}]/gu) || []).length;
    const alphaRatio = alphaChars / (clean.length || 1);

    return clean.length < 30 || words < 5 || alphaRatio < 0.3;
}

// 🔥 retry with backoff
export async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 500
): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, delay));
        return withRetry(fn, retries - 1, delay * 2);
    }
}

// 🔥 timeout
function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("OCR_TIMEOUT")), ms)
        ),
    ]);
}


async function preprocessImage(input: string, output: string) {
    await sharp(input)
        .grayscale()
        .sharpen()
        .median(1)
        .resize({ width: 2000 })
        .threshold(170)
        .toFile(output);
}

export async function extractFromPDF(url: string) {
    // 🔥 cache
    if (pdfCache.has(url)) {
        console.log("CACHE HIT");
        return pdfCache.get(url)!;
    }

    // 🔥 fetch buffer (still needed for OCR fallback)
    const { data, headers } = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
    });

    const sizeMB = Number(headers["content-length"] || 0) / (1024 * 1024);
    if (sizeMB > 20) {
        throw new Error("PDF_TOO_LARGE");
    }

    const pdfBuffer = Buffer.from(data);

    // 🆕 NEW API usage
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();

    let text = result.text || "";

    // 🔥 fast path
    if (!isScanned(text)) {
        const clean = text.replace(/\s+/g, " ").trim();
        pdfCache.set(url, clean);
        return clean;
    }

    console.log("Scanned PDF detected → OCR fallback");

    // 🔥 OCR fallback
    const converter = createConverter(pdfBuffer);

    const results = await Promise.all(
        Array.from({ length: result.pages.length }, (_, i) =>
            globalQueue.add(async () => {
                let imagePath: string | undefined;
                let processedPath: string | undefined;

                try {
                    imagePath = await pdfPageToImage(converter, i + 1);
                    if (imagePath) {
                        processedPath = imagePath.replace(".png", "-processed.png");

                        await preprocessImage(imagePath, processedPath);

                        const ocrText = await withRetry(() =>
                            withTimeout(runOCR(processedPath!))
                        );

                        const cleanText = await cleanOCR(ocrText);

                        return cleanText;
                    }
                } finally {
                    if (imagePath) await fs.unlink(imagePath).catch(() => { });
                    if (processedPath) await fs.unlink(processedPath).catch(() => { });
                }
            })
        )
    );

    const finalText = results
        .map((t) => t?.replace(/\s+/g, " ").trim())
        .join("\n\n");

    pdfCache.set(url, finalText);

    return finalText;
};

