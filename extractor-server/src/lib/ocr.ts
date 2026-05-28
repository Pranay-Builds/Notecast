import dotenv from "dotenv";
dotenv.config();

import vision from "@google-cloud/vision";
import Tesseract from "tesseract.js";

const clientEmail = process.env.GCP_CLIENT_EMAIL;
const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!clientEmail || !privateKey) {
  throw new Error("Missing Google Vision credentials");
}

const client = new vision.ImageAnnotatorClient({
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});

async function runTesseractOCR(imagePath: string) {
  try {
    console.log("Running Tesseract fallback OCR...");

    const result = await Tesseract.recognize(imagePath, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`Tesseract Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    return result.data.text.trim();
  } catch (err: any) {
    console.error("Tesseract OCR failed:", {
      message: err?.message,
      stack: err?.stack,
    });

    return "";
  }
}

export async function runOCR(imagePath: string) {
  try {
    const [result] = await client.textDetection(imagePath);

    if (result.error) {
      throw new Error(result.error.message || "OCR_ERROR");
    }

    const visionText =
      result.fullTextAnnotation?.text?.trim() || "";

    // Use Vision result if valid
    if (visionText.length > 0) {
      return visionText;
    }

    console.warn(
      "Google Vision returned empty text. Falling back to Tesseract..."
    );

    return await runTesseractOCR(imagePath);
  } catch (err: any) {
    console.error("Google Vision OCR failed:", {
      message: err?.message,
      stack: err?.stack,
    });

    // Fallback to Tesseract if Vision fails
    return await runTesseractOCR(imagePath);
  }
}