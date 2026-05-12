import axios from "axios";
import fs from "fs/promises";
import PQueue from "p-queue";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";

import { runOCR } from "../lib/ocr";
import { createConverter, pdfPageToImage } from "../utils/pdfToPic";
import { cleanOCR } from "../utils/cleanOCR";

// 🔥 queue
const globalQueue = new PQueue({ concurrency: 3 });

// 🔥 cache (basic limit)
const pdfCache = new Map<string, string>();

function isScanned(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();

  if (clean.length < 200) return true;

  const words = clean.split(/\s+/).length;

  const avgWordLength =
    clean.replace(/[^a-zA-Z0-9]/g, "").length / Math.max(words, 1);

  const lineBreaks = (text.match(/\n/g) || []).length;

  const hasStructure =
    /(\d+\.\s)|([A-Z]{2,})|(\bTable\b|\bFigure\b|\bPage\b)/.test(text);

  const noiseChars = (text.match(/[^a-zA-Z0-9\s.,()%\-]/g) || []).length;
  const noiseRatio = noiseChars / Math.max(clean.length, 1);

  // decision logic
  const lowDensity = words < 120;
  const veryNoisy = noiseRatio > 0.15;
  const weakStructure = !hasStructure && lineBreaks < 3;

  return lowDensity && (veryNoisy || weakStructure);
}

// 🔥 retry
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise((r) => setTimeout(r, 500));
    return withRetry(fn, retries - 1);
  }
}

// 🔥 timeout
function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("OCR_TIMEOUT")), ms),
    ),
  ]);
}

// 🔥 better preprocessing
async function preprocessImage(input: string, output: string) {
  await sharp(input)
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: 1800 })
    .threshold(150)
    .toFile(output);
}

// 🔥 clean text
function cleanText(text: string) {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-\s+/g, "")
    .trim();
}

export async function extractFromPDF(url: string) {
  // cache
  if (pdfCache.has(url)) return pdfCache.get(url)!;

  const { data, headers } = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
  });

  const sizeMB = Number(headers["content-length"] || 0) / (1024 * 1024);
  if (sizeMB > 20) throw new Error("PDF_TOO_LARGE");

  const pdfBuffer = Buffer.from(data);

  // 🔥 safe parse
  let text = "";
  let pages = 0;

  try {
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();

    text = result.text || "";
    pages = result.pages?.length || 0;
  } catch (err) {
    console.log("PDF parse failed → forcing OCR");
  }

  let finalText = text;

  if (isScanned(text) && text.length < 5000) {
    console.log("Using OCR fallback");

    const converter = createConverter(pdfBuffer);

    const MAX_OCR_PAGES = 10;
    const pagesToProcess = Math.min(pages || 10, MAX_OCR_PAGES);


    const tasks = Array.from({ length: pagesToProcess }, (_, i) =>
      globalQueue.add(async () => {
        let imagePath: string | undefined;
        let processedPath: string | undefined;

        try {
          imagePath = await pdfPageToImage(converter, i + 1);
          if (!imagePath) return "";

          processedPath = imagePath.replace(".png", "-processed.png");

          await preprocessImage(imagePath, processedPath);

          const ocrText = await withRetry(() =>
            withTimeout(runOCR(processedPath!))
          );

          return cleanOCR(ocrText);
        } catch (e) {
          const ocrText = await withRetry(() =>
            withTimeout(runOCR(processedPath!), 20000),
            2
          );

          const cleaned = await cleanOCR(ocrText);

          
          if (cleaned.length < 20) return "";

          return cleaned;
        } finally {
          await Promise.all([
            imagePath ? fs.unlink(imagePath).catch(() => { }) : null,
            processedPath ? fs.unlink(processedPath).catch(() => { }) : null,
          ]);
        }
      })
    );

    const results = (await Promise.all(tasks)).filter(Boolean);

    const ocrText = results.join("\n\n");

    // 🔥 pick better result
    if (ocrText.length > text.length * 1.2) {
      finalText = ocrText;
    }
  }

  const cleaned = cleanText(finalText);

  // cache limit
  if (pdfCache.size > 50) pdfCache.clear();
  pdfCache.set(url, cleaned);

  return cleaned;
}
