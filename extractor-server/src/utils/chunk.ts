export function chunkText(text: string, maxLength = 500) {
    const sentences = text.split(/(?<=[.?!])\s+/);

    const chunks: string[] = [];


    let current = "";

    for(const sentence of sentences) {
        if((current + sentence).length > maxLength) {
            chunks.push(current.trim());
            current = sentence;
        } else {
            current += " " + sentence;
        }
    };


    if (current.trim()) {
        chunks.push(current.trim());
    };


    return chunks;
}