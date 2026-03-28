import ytDlp from "yt-dlp-exec";
import * as fs from "fs";
import * as path from "path";
import { transcribe } from "../lib/transcribe";

function isLowQuality(text: string) {
  if (text.length < 100) return true;

  const weirdRatio =
    (text.match(/[^a-zA-Z0-9\u0900-\u097F\s]/g) || []).length / text.length;

  return weirdRatio > 0.2;
}

export function getYouTubeVideoId(input: string) {
  try {
    // If already looks like an ID (11 chars), return it
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      return input;
    }

    const url = new URL(input);

    // 1. Standard: youtube.com/watch?v=ID
    if (url.searchParams.get("v")) {
      return url.searchParams.get("v");
    }

    // 2. Short: youtu.be/ID
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1);
    }

    // 3. Embed: youtube.com/embed/ID
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2];
    }

    // 4. Shorts: youtube.com/shorts/ID
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2];
    }

    return null;
  } catch (e) {
    return null;
  }
}

export async function getYoutubeSubtitles(videoId: string) {
  try {
    const result: any = await ytDlp(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        skipDownload: true,
        writeAutoSub: true,
        writeSub: true,
        subLang: "en",
        subFormat: "json3",
        dumpSingleJson: true,
      },
    );

    // 🔥 Try manual subtitles first
    let captions = result.subtitles?.en || result.automatic_captions?.en;

    if (!captions || captions.length === 0) {
      throw new Error("NO_CAPTIONS_FOUND");
    }

    // yt-dlp gives multiple formats, pick json3
    const jsonTrack = captions.find((c: any) => c.ext === "json3");

    if (!jsonTrack?.url) {
      throw new Error("NO_JSON_TRACK");
    }

    // fetch subtitle JSON
    const res = await fetch(jsonTrack.url);
    const data = await res.json();

    // 🔥 parse text
    const text = data.events
      ?.map((e: any) => e.segs?.map((s: any) => s.utf8).join("") || "")
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
    console.log("yt-dlp subtitles failed:", err);
    throw err;
  }
}

async function downloadYouTubeAudio(videoId: string) {
  const filePath = path.join(
    process.cwd(),
    `audio-${videoId}-${Date.now()}.mp3`,
  );

  await ytDlp(`https://www.youtube.com/watch?v=${videoId}`, {
    extractAudio: true,
    audioFormat: "mp3",
    output: filePath,
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

    return result.text;
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export async function getYoutubeVideoTranscript(input: string) {
  const videoId = getYouTubeVideoId(input);

  if (!videoId) {
    throw new Error("INVALID_YOUTUBE_URL");
  }

  try {
    
    const subs = await getYoutubeSubtitles(videoId);
    console.log(subs);
    return subs;
  } catch {

    const text = await whisperFallback(videoId);

    return {
      text,
      source: "whisper",
    };
  }
}

async function main() {
  const transcript = await getYoutubeVideoTranscript(
    "https://www.youtube.com/watch?v=3AtDnEC4zak",
  );

  console.log("Transcript:", transcript);
}

main();
