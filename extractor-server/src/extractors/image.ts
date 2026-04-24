import axios from "axios";
import sharp from "sharp";
import crypto from "crypto";
import { runOCR } from "../lib/ocr";
import { cleanOCR } from "../utils/cleanOCR";
import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

async function runOCRFromBuffer(buffer: Buffer) {
    const tempPath = path.join("/tmp", `${uuid()}.png`);

    await fs.writeFile(tempPath, buffer);

    try {
        const text = await runOCR(tempPath);
        return text;
    } finally {
        await fs.unlink(tempPath).catch(() => { });
    }
}

function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error("OCR_TIMEOUT")), ms)
        ),
    ]);
}


const imageCache = new Map<string, string>();

function hashBuffer(buffer: Buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

// 🔥 light preprocessing (DON'T overdo this)
async function preprocessImage(buffer: Buffer) {
    return sharp(buffer)
        .grayscale()
        .resize({ width: 1200 }) // keep it light
        .toBuffer();
}

// 🔥 clean text (basic)
function cleanText(text: string) {
    return text
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export async function extractFromImage(url: string) {
    // 🔥 fetch image
    const { data } = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
    });


    const buffer = Buffer.from(data);
    if (buffer.length > 5 * 1024 * 1024) {
        throw new Error("IMAGE_TOO_LARGE");
    }

    // 🔥 hash for caching
    const hash = hashBuffer(buffer);

    if (imageCache.has(hash)) {
        return imageCache.get(hash)!;
    }

    // 🔥 preprocess (light)
    let processedBuffer: Buffer;

    try {
        processedBuffer = await preprocessImage(buffer);
    } catch {
        processedBuffer = buffer;
    }

    // 🔥 OCR
    let text = "";

    try {
        text = await withTimeout(runOCRFromBuffer(processedBuffer));
    } catch (err) {
        throw new Error("OCR_FAILED");
    }

    const cleaned = cleanText(await cleanOCR(text));

    // 🔥 cache (limit size)
    if (imageCache.size > 100) imageCache.clear();
    imageCache.set(hash, cleaned);

    return cleaned;
}