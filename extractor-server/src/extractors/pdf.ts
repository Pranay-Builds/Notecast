import axios from "axios";
import fs from "fs/promises";
import os from "os";
import path from "path";

import PQueue from "p-queue";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";

import { runOCR } from "../lib/ocr";
import { createConverter, pdfPageToImage } from "../utils/pdfToPic";
import { cleanOCR } from "../utils/cleanOCR";

const globalQueue = new PQueue({
  concurrency: 2,
});

const TEMP_DIR = path.join(os.tmpdir(), "notecast-pdf");

async function ensureTempDir() {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

function isScanned(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();

  if (clean.length < 1000) return true;

  const words = clean.split(/\s+/).length;

  const noiseChars =
    (text.match(/[^a-zA-Z0-9\s.,()%\-]/g) || []).length;

  const noiseRatio = noiseChars / Math.max(clean.length, 1);

  const hasStructure =
    /(\d+\.\s)|([A-Z]{2,})|(\bTable\b|\bFigure\b|\bPage\b)/.test(
      text
    );

  return (
    words < 120 ||
    noiseRatio > 0.15 ||
    !hasStructure
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 1
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;

    await new Promise((r) => setTimeout(r, 500));

    return withRetry(fn, retries - 1);
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms = 15000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("OCR_TIMEOUT")), ms)
    ),
  ]);
}

async function preprocessImage(
  input: string,
  output: string
) {
  await sharp(input)
    .grayscale()
    .normalize()
    .sharpen()
    .resize({
      width: 1400,
      withoutEnlargement: true,
    })
    .threshold(150)
    .toFile(output);
}

function cleanText(text: string) {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-\s+/g, "")
    .trim();
}

export async function extractFromPDF(url: string) {
  await ensureTempDir();

  console.log("Starting PDF extraction:", url);

  const { data, headers } = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  });

  const sizeMB =
    Number(headers["content-length"] || 0) /
    (1024 * 1024);

  if (sizeMB > 20) {
    throw new Error("PDF_TOO_LARGE");
  }

  const pdfBuffer = Buffer.from(data);

  let text = "";
  let pages = 0;

  try {
    const parser = new PDFParse({
      data: pdfBuffer,
    });

    const result = await parser.getText();

    text = result.text || "";
    pages = result.pages?.length || 0;

    console.log("PDF parsed normally:", {
      pages,
      textLength: text.length,
    });
  } catch (err: any) {
    console.error("PDF parse failed:", err?.message);
  }

  let finalText = text;

  const shouldOCR =
    isScanned(text) || text.length < 1000;

  if (shouldOCR) {
    console.log("Using OCR fallback");

    const converter = createConverter(pdfBuffer);

    const MAX_OCR_PAGES = 3;

    const pagesToProcess = Math.min(
      pages || 3,
      MAX_OCR_PAGES
    );

    const tasks = Array.from(
      { length: pagesToProcess },
      (_, i) =>
        globalQueue.add(async () => {
          let imagePath: string | undefined;
          let processedPath: string | undefined;

          try {
            imagePath = await pdfPageToImage(
              converter,
              i + 1
            );

            if (!imagePath) {
              return "";
            }

            processedPath = imagePath.replace(
              ".png",
              "-processed.png"
            );

            await preprocessImage(
              imagePath,
              processedPath
            );

            const ocrText = await withRetry(() =>
              withTimeout(
                runOCR(processedPath!),
                15000
              )
            );

            return cleanOCR(ocrText);
          } catch (err: any) {
            console.error("OCR page failed:", {
              page: i + 1,
              message: err?.message,
            });

            return "";
          } finally {
            await Promise.all([
              imagePath
                ? fs.unlink(imagePath).catch(() => {})
                : null,

              processedPath
                ? fs.unlink(processedPath).catch(() => {})
                : null,
            ]);
          }
        })
    );

    const results = (
      await Promise.all(tasks)
    ).filter(Boolean);

    const ocrText = results.join("\n\n");

    console.log("OCR completed:", {
      ocrLength: ocrText.length,
    });

    if (ocrText.length > text.length * 0.7) {
      finalText = ocrText;
    }
  }

  const cleaned = cleanText(finalText);

  if (!cleaned.length) {
    throw new Error("EMPTY_PDF_TEXT");
  }

  console.log("PDF extraction complete:", {
    finalLength: cleaned.length,
  });

  return cleaned;
}``