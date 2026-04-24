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
        content: `
You are correcting OCR output from handwritten school notes.

Rules:
- Aggressively fix spelling mistakes
- Assume this is academic text (math syllabus)
- Convert broken words into real English words
- Fix spacing and grammar
- Use common sense (e.g. "Numbee" → "Numbers")
- If text looks like chapter names, normalize them

Return ONLY corrected text.

Text:
${text}
`
      },
      {
        role: "user",
        content: text
      }
    ]
  });


  return response.choices[0].message.content?.trim() || text;
}