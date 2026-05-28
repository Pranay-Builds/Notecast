import { fromBuffer } from "pdf2pic";
import fs from "fs";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const tmpDir = path.join(os.tmpdir(), "notecast-pdf");
fs.mkdirSync(tmpDir, { recursive: true });

export function createConverter(pdfBuffer: Buffer) {
    return fromBuffer(pdfBuffer, {
        density: 400, // 🔥 critical for OCR accuracy
        format: "png",
        width: 1200,
        height: 1600,
        savePath: tmpDir,
        saveFilename: uuidv4(), // unique prefix
    });
}

export async function pdfPageToImage(
    converter: any,
    pageNumber: number
) {
    const result = await converter(pageNumber);
    return result.path;
}