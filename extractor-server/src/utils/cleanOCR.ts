import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function cleanOCR(text: string) {
    console.log('[CLEAN OCR] RUNNING')
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "Fix OCR errors. Return clean corrected text. Do not add extra explanation."
      },
      {
        role: "user",
        content: text
      }
    ]
  });


  return response.choices[0].message.content?.trim() || text;
}