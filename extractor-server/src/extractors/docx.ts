import mammoth from "mammoth";
import axios from "axios";

function normalizeDocxText(text: string) {
  return text
    .replace(/-\s+\n/g, "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

export async function extractFromDocxUrl(url: string) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
  });

  const buffer = Buffer.from(res.data);

  const result = await mammoth.extractRawText({
    buffer,
  });

  const text = result.value || "";

  return normalizeDocxText(text);
}