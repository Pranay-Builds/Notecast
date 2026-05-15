function normalizeText(text: string) {
  return text
    .replace(/-\s+\n/g, "")     
    .replace(/\s+/g, " ")       
    .replace(/\n+/g, " ")       
    .trim();
}

export function extractText(text: string) {
    return normalizeText(text);
}