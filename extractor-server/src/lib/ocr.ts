import path from "path";
import vision from "@google-cloud/vision";

const keyPath = path.resolve(
  process.cwd(),
  "notecast-489517-c925deff0e4b.json"
);

const client = new vision.ImageAnnotatorClient({
  keyFilename: keyPath,
});

export async function runOCR(imagePath: string) {
    const [result] = await client.textDetection(imagePath);

    if (result.error) {
        throw new Error(result.error.message || "OCR error occurred");
    }

    return result.fullTextAnnotation?.text || "";
}