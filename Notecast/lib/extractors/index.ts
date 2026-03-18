// extract content in text form from all sources
import { YoutubeTranscript } from "youtube-transcript";
import { Innertube } from "youtubei.js";
import ytdl from "@distube/ytdl-core";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import mammoth from "mammoth";
import officeparser from "officeparser";
import { extractTextFromImage } from "./ocr";
import Groq from "groq-sdk";

// ─── Limits ──────────────────────────────────────────────────────────────────

const LIMITS = {
    PDF_MAX_PAGES: 150,
    PDF_MAX_BYTES: 50 * 1024 * 1024,       // 50 MB
    YOUTUBE_MAX_DURATION_SECS: 3600,        // 1 hour
    AUDIO_MAX_BYTES: 25 * 1024 * 1024,     // 25 MB (Groq limit)
    WEBPAGE_MAX_BYTES: 5 * 1024 * 1024,    // 5 MB
    FILE_MAX_BYTES: 100 * 1024 * 1024,     // 100 MB general file cap
    FETCH_TIMEOUT_MS: 15_000,
} as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

function cleanText(text: string): string {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function deduplicateLines(text: string): string {
    const seen = new Set<string>();
    return text
        .split("\n")
        .filter((line) => {
            const trimmed = line.trim();
            if (!trimmed) return true;
            if (seen.has(trimmed)) return false;
            seen.add(trimmed);
            return true;
        })
        .join("\n");
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
        ),
    ]);
}

/** Stream a URL into a Buffer, aborting once maxBytes is exceeded. */
async function fetchWithSizeLimit(
    url: string,
    maxBytes: number,
    timeoutMs = LIMITS.FETCH_TIMEOUT_MS
): Promise<Buffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

        const contentLength = res.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > maxBytes) {
            throw new Error(`Content-Length ${contentLength} exceeds limit of ${maxBytes} bytes`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const chunks: Uint8Array[] = [];
        let total = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maxBytes) {
                reader.cancel();
                throw new Error(`Response body exceeded limit of ${maxBytes} bytes`);
            }
            chunks.push(value);
        }

        return Buffer.concat(chunks);
    } finally {
        clearTimeout(timer);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function extractText({
    type,
    file,
    url,
    content,
}: {
    type: "file" | "youtube" | "webpage" | "text";
    file?: File;
    url?: string;
    content?: string;
}): Promise<string> {
    switch (type) {
        case "text":
            return content?.trim() ?? "";
        case "youtube":
            return extractTextFromYoutube(url!);
        case "webpage":
            return extractTextFromWebpage(url!);
        case "file": {
            const text = await extractTextFromFile(file!);
            return deduplicateLines(cleanText(text));
        }
        default:
            return "";
    }
}

// ─── YouTube ─────────────────────────────────────────────────────────────────

async function getYoutubeVideoId(url: string): Promise<string> {
    const parsed = new URL(url);
    const videoId =
        parsed.hostname.includes("youtu.be")
            ? parsed.pathname.slice(1)
            : parsed.searchParams.get("v");
    if (!videoId) throw new Error("Cannot extract videoId from URL");
    return videoId;
}

// Single helper — retrieve_player:false skips the JS player fetch that causes
// "Failed to extract signature/n decipher" and ListItemView parse errors.
// We only need metadata + caption track URLs, never actual stream formats.
async function getInnertubeBasicInfo(videoId: string) {
    const youtube = await Innertube.create({ retrieve_player: false });
    return youtube.getBasicInfo(videoId, "WEB");
}

async function checkYoutubeDuration(videoId: string): Promise<void> {
    const info = await getInnertubeBasicInfo(videoId);
    const durationSecs = info.basic_info.duration ?? 0;
    if (durationSecs > LIMITS.YOUTUBE_MAX_DURATION_SECS) {
        throw new Error(
            `Video duration ${durationSecs}s exceeds limit of ${LIMITS.YOUTUBE_MAX_DURATION_SECS}s (1 hour)`
        );
    }
}

async function extractYoutubeCaptions(videoId: string): Promise<string | null> {
    const info = await getInnertubeBasicInfo(videoId);
    const captions = info.captions?.caption_tracks;
    if (!captions?.length) return null;

    const track = captions[0];
    const buf = await fetchWithSizeLimit(track.base_url, LIMITS.WEBPAGE_MAX_BYTES);
    const xml = buf.toString("utf-8");
    return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function transcribeYoutube(videoId: string): Promise<string> {
    const url = `https://youtube.com/watch?v=${videoId}`;

    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
        const stream = ytdl(url, { quality: "lowestaudio", filter: "audioonly" });
        const chunks: Buffer[] = [];
        let total = 0;

        stream.on("data", (chunk: Buffer) => {
            total += chunk.byteLength;
            if (total > LIMITS.AUDIO_MAX_BYTES) {
                stream.destroy(new Error(`Audio exceeds ${LIMITS.AUDIO_MAX_BYTES} bytes`));
                return;
            }
            chunks.push(chunk);
        });
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const audioFile = new File([new Uint8Array(audioBuffer)], "audio.webm", { type: "audio/webm" });

    const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "text",
    });

    return cleanText(transcription as unknown as string);
}

async function extractTextFromYoutube(url: string): Promise<string> {
    const videoId = await getYoutubeVideoId(url);

    // Enforce duration limit before downloading anything
    await checkYoutubeDuration(videoId);

    // Method 1: youtube-transcript (fastest, no download)
    try {
        const transcript = await withTimeout(
            YoutubeTranscript.fetchTranscript(videoId),
            10_000,
            "YoutubeTranscript"
        );
        if (transcript.length) return transcript.map((t) => t.text).join(" ");
    } catch { }

    // Method 2: Innertube captions (still no audio download)
    try {
        const captions = await withTimeout(
            extractYoutubeCaptions(videoId),
            15_000,
            "YoutubeCaptions"
        );
        if (captions) return captions;
    } catch { }

    // Method 3: Whisper transcription (last resort)
    return transcribeYoutube(videoId);
}

// ─── Webpage ─────────────────────────────────────────────────────────────────

async function extractTextFromWebpage(url: string): Promise<string> {
    const buffer = await fetchWithSizeLimit(url, LIMITS.WEBPAGE_MAX_BYTES);
    const html = buffer.toString("utf-8");

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article?.textContent && article.textContent.length > 700) {
        return cleanText(article.textContent);
    }

    const fallback = dom.window.document.body?.textContent ?? "";
    return cleanText(fallback);
}

// ─── File dispatch ────────────────────────────────────────────────────────────

async function extractTextFromFile(file: File): Promise<string> {
    if (file.size > LIMITS.FILE_MAX_BYTES) {
        throw new Error(`File size ${file.size} exceeds limit of ${LIMITS.FILE_MAX_BYTES} bytes`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type;

    if (mime === "application/pdf") return extractFromPDF(buffer);
    if (mime.startsWith("image/")) return extractFromImage(buffer);
    if (
        mime === "application/msword" ||
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) return extractFromDocx(buffer);
    if (
        mime === "application/vnd.ms-powerpoint" ||
        mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        mime === "application/vnd.ms-excel" ||
        mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) return extractFromOffice(buffer);
    if (mime.startsWith("text/")) return file.text();
    if (mime.startsWith("audio/") || mime.startsWith("video/")) return extractFromMedia(file);

    throw new Error(`Unsupported file type: ${mime}`);
}

// ─── Extractors ───────────────────────────────────────────────────────────────

async function extractFromPDF(buffer: Buffer): Promise<string> {
    if (buffer.byteLength > LIMITS.PDF_MAX_BYTES) {
        throw new Error(`PDF exceeds size limit of ${LIMITS.PDF_MAX_BYTES} bytes`);
    }

    const pdfParse = (await import("pdf-parse")) as any;
    const data = await pdfParse(buffer, { max: LIMITS.PDF_MAX_PAGES });

    if (data.text?.trim().length > 100) return cleanText(data.text);

    // Fallback: OCR (scanned PDF)
    return cleanText(await extractTextFromImage(buffer));
}

async function extractFromImage(buffer: Buffer): Promise<string> {
    return cleanText(await extractTextFromImage(buffer));
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
    const { value } = await mammoth.extractRawText({ buffer });
    return cleanText(value);
}

async function extractFromOffice(buffer: Buffer): Promise<string> {
    const ast = await officeparser.parseOffice(buffer);
    const text = ast.toText();
    return cleanText(text);
}

async function extractFromMedia(file: File): Promise<string> {
    if (file.size > LIMITS.AUDIO_MAX_BYTES) {
        throw new Error(
            `Audio/video file size ${file.size} exceeds Groq limit of ${LIMITS.AUDIO_MAX_BYTES} bytes`
        );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
    const transcription = await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        response_format: "text",
    });
    return cleanText(transcription as unknown as string);
}