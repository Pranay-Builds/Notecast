import ytDlp from "yt-dlp-exec";
import * as fs from "fs";
import * as path from "path";
import { transcribe } from "../lib/transcribe";

// -------------------------
// Video ID extraction
// -------------------------
export function getYouTubeVideoId(input: string) {
  try {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

    const url = new URL(input);

    if (url.searchParams.get("v")) return url.searchParams.get("v");

    if (url.hostname === "youtu.be") return url.pathname.slice(1);

    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2];

    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2];

    return null;
  } catch {
    return null;
  }
}

// -------------------------
// Caption fetch (robust MVP)
// -------------------------
async function getCaptions(videoId: string) {
  const result: any = await ytDlp(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      skipDownload: true,
      dumpSingleJson: true,
    }
  );

  const tracks =
    result.subtitles?.en ||
    result.subtitles?.en_or ||
    result.automatic_captions?.en ||
    result.automatic_captions?.en_or ||
    [];

  if (!tracks.length) throw new Error("NO_CAPTIONS");

  // Prefer json3, fallback to vtt
  const track =
    tracks.find((t: any) => t.ext === "json3") ||
    tracks.find((t: any) => t.ext === "vtt") ||
    tracks[0];

  if (!track?.url) throw new Error("NO_CAPTION_URL");

  const res = await fetch(track.url);

  if (track.ext === "vtt") {
    const vtt = await res.text();
    return parseVTT(vtt);
  }

  const data = await res.json();
  return parseJSON3(data);
}

// -------------------------
// JSON3 parser
// -------------------------
function parseJSON3(data: any) {
  return (data.events || [])
    .flatMap((e: any) => (e.segs || []).map((s: any) => s.utf8 || ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// -------------------------
// VTT parser
// -------------------------
function parseVTT(vtt: string) {
  return vtt
    .replace(/WEBVTT.*\n/g, "")
    .replace(/\d+\n/g, "")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> .*?\n/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

// -------------------------
// Audio fallback (Whisper)
// -------------------------
async function whisperFallback(videoId: string) {
  const filePath = path.join(
    process.cwd(),
    `audio-${videoId}-${Date.now()}.webm`
  );

  try {
    await ytDlp(`https://www.youtube.com/watch?v=${videoId}`, {
      output: filePath,
      format: "bestaudio/best",
    });

    const result = await transcribe({
      type: "file",
      path: filePath,
    });

    return result.text;
  } finally {
    fs.unlink(filePath, () => {});
  }
}

// -------------------------
// Quality gate
// -------------------------
function isBad(text: string) {
  if (!text || text.length < 120) return true;

  const noise =
    (text.match(/[^a-zA-Z0-9\u0900-\u097F\s.,]/g) || []).length / text.length;

  return noise > 0.25;
}

// -------------------------
// Main API
// -------------------------
export async function extractYoutubeVideoTranscript(input: string) {
  const videoId = getYouTubeVideoId(input);

  if (!videoId) throw new Error("INVALID_YOUTUBE_URL");

  try {
    const text = await getCaptions(videoId);

    if (isBad(text)) throw new Error("LOW_QUALITY_CAPTIONS");
    console.log("YOUTUBE MANUAL CAPTIONS USED");
    return {
      text,
      source: "captions",
    };
  } catch (err) {
    const text = await whisperFallback(videoId);

    return {
      text,
      source: "whisper",
    };
  }
}