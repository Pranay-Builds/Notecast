import axios from "axios";
import sharp from "sharp";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { runOCR } from "../lib/ocr";

function normalizeText(text: string) {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


export async function extractFromImageUrl(url: string) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
  });

  const sizeMB = Number(res.headers["content-length"] || 0) / (1024 * 1024);

  if (sizeMB > 10) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const id = Date.now().toString();

  const rawPath = path.join(process.cwd(), `img-${id}.png`);
  const processedPath = path.join(process.cwd(), `img-${id}-proc.png`);

  try {
    
    await fs.writeFile(rawPath, Buffer.from(res.data));

    
    await sharp(rawPath)
      .grayscale()
      .normalize()
      .resize({ width: 1600 })
      .toFile(processedPath);

    
    const ocrText = await runOCR(processedPath);

    const text = normalizeText(ocrText);

    if (text.length < 20) {
      throw new Error("LOW_QUALITY_OCR");
    }

    return text;

  } finally {
   
    await fs.unlink(rawPath).catch(() => {});
    await fs.unlink(processedPath).catch(() => {});
  }
}