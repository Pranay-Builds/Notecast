
import ytDlp from "yt-dlp-exec";
import * as fs from "fs";
import * as path from "path";
import { transcribe } from "../lib/transcribe";

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

// 🔥 safer fetch
async function fetchJsonSafe(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  const text = await res.text();

  if (!text || !text.trim().startsWith("{")) {
    console.log("❌ Invalid subtitle response:", text.slice(0, 200));
    throw new Error("INVALID_SUBTITLE_RESPONSE");
  }

  return JSON.parse(text);
}

export async function getYoutubeSubtitles(videoId: string) {
  try {
    const result: any = await ytDlp(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        skipDownload: true,
        writeAutoSub: true,
        writeSub: true,
        subLang: "en.*",
        subFormat: "json3",
      }
    );

    const captions =
      result.subtitles?.en || result.automatic_captions?.en;

    if (!captions || captions.length === 0) {
      throw new Error("NO_CAPTIONS_FOUND");
    }

    const jsonTrack = captions.find((c: any) => c.ext === "json3");

    if (!jsonTrack?.url) {
      throw new Error("NO_JSON_TRACK");
    }

    const data = await fetchJsonSafe(jsonTrack.url);

    const text = data.events
      ?.map((e: any) =>
        e.segs?.map((s: any) => s.utf8).join("") || ""
      )
      .join(" ")
      .replace(/\n/g, " ")
      .trim();

    if (!text || text.length < 50) {
      throw new Error("LOW_QUALITY_SUBS");
    }

    return {
      text,
      source: "yt-dlp",
    };
  } catch (err) {
    console.log("⚠️ yt-dlp subtitles failed:", err);
    throw err;
  }
}

async function downloadYouTubeAudio(videoId: string) {
  const basePath = path.join(
    process.cwd(),
    `audio-${videoId}-${Date.now()}`
  );

  const filePath = `${basePath}.webm`;

  await ytDlp(`https://www.youtube.com/watch?v=${videoId}`, {
    output: filePath,
    format: "bestaudio",
  });

  return filePath;
}

async function whisperFallback(videoId: string) {
  const filePath = await downloadYouTubeAudio(videoId);

  try {
    const result = await transcribe({
      type: "file",
      path: filePath,
    });

    if (!result?.text) {
      throw new Error("EMPTY_WHISPER_RESULT");
    }

    return result.text;
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export async function extractYoutubeVideoTranscript(input: string) {
  const videoId = getYouTubeVideoId(input);

  if (!videoId) {
    throw new Error("INVALID_YOUTUBE_URL");
  }

  // 🔥 Try subtitles first
  try {
    return await getYoutubeSubtitles(videoId);
  } catch (err) {
    console.log("⚠️ Subtitles failed, trying Whisper...");
  }

  // 🔥 Fallback to Whisper
  try {
    const text = await whisperFallback(videoId);

    return {
      text,
      source: "whisper",
    };
  } catch (err) {
    console.log("❌ Whisper failed:", err);
    throw new Error("FULL_TRANSCRIPT_FAILED");
  }
}

