import axios from "axios";
import crypto from "crypto";
import mammoth from "mammoth";

const docCache = new Map<string, string>();

function hashBuffer(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}


function cleanText(text: string) {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/-\s+/g, "")
    .trim();
}


export async function extractFromDocx(url: string) {

  const { data } = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 10000,
  });

  const buffer = Buffer.from(data);

  const hash = hashBuffer(buffer);

  if (docCache.has(hash)) {
    return docCache.get(hash)!;
  }


  let text = "";

  try {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || "";
  } catch (err) {
    throw new Error("DOCX_PARSE_FAILED");
  }

  const cleaned = cleanText(text);

 
  if (docCache.size > 100) {
    const firstKey = docCache.keys().next().value;
    if (firstKey) docCache.delete(firstKey);
  }

  docCache.set(hash, cleaned);

  return cleaned;
}