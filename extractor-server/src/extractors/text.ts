import crypto from "crypto";


const textCache = new Map<string, string>();

function hashText(text: string) {
    return crypto.createHash("sha256").update(text).digest("hex");
}


function cleanText(text: string) {
    return text
        .replace(/\r\n/g, "\n")          // normalize line breaks
        .replace(/\n{2,}/g, "\n")        // remove excessive newlines
        .replace(/\t/g, " ")             // tabs → spaces
        .replace(/\s+/g, " ")            // collapse spaces
        .replace(/-\s+/g, "")            // fix broken words
        .trim();
}


function validateText(text: string) {
    if (!text || text.length < 20) {
        throw new Error("TEXT_TOO_SHORT");
    }

    if (text.length > 100_000) {
        throw new Error("TEXT_TOO_LARGE");
    }
}

export async function extractFromText(input: string) {
    validateText(input);

    const cleaned = cleanText(input);

    const hash = hashText(cleaned);

    if (textCache.has(hash)) {
        return textCache.get(hash) || "";
    }

    const firstKey = textCache.keys().next().value;

    if (firstKey !== undefined) {
        textCache.delete(firstKey);
    }

    return cleaned;
}