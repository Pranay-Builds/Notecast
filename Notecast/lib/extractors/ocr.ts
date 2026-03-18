import vision from "@google-cloud/vision"

const client = new vision.ImageAnnotatorClient()

export async function extractTextFromImage(buffer: Buffer) {
  const [result] = await client.textDetection({
    image: { content: buffer }
  })

  const detections = result.textAnnotations
  return detections?.[0]?.description ?? ""
}