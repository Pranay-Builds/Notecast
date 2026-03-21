import { Innertube } from "youtubei.js";
import ytDlp from "yt-dlp-exec";
import * as fs from "fs";
import * as path from "path";
import { transcribe } from "../lib/transcribe";

let yt: any;

export async function initYouTube() {
    yt = await Innertube.create();
};

function isLowQuality(text: string) {
    if (text.length < 100) return true;

    const weirdRatio = (text.match(/[^a-zA-Z0-9\u0900-\u097F\s]/g) || []).length / text.length;

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
        if (url.searchParams.get('v')) {
            return url.searchParams.get('v');
        }

        // 2. Short: youtu.be/ID
        if (url.hostname === 'youtu.be') {
            return url.pathname.slice(1);
        }

        // 3. Embed: youtube.com/embed/ID
        if (url.pathname.startsWith('/embed/')) {
            return url.pathname.split('/')[2];
        }

        // 4. Shorts: youtube.com/shorts/ID
        if (url.pathname.startsWith('/shorts/')) {
            return url.pathname.split('/')[2];
        }

        return null;
    } catch (e) {
        return null;
    }
};


async function downloadYouTubeAudio(videoId: string) {
    const filePath = path.join(
        process.cwd(),
        `audio-${videoId}-${Date.now()}.mp3`
    );

    await ytDlp(`https://www.youtube.com/watch?v=${videoId}`, {
        extractAudio: true,
        audioFormat: "mp3",
        output: filePath
    });

    return filePath;
};


async function whisperFallback(videoId: string) {
    const filePath = await downloadYouTubeAudio(videoId);

    try {
        const result = await transcribe({
            type: "file",
            path: filePath
        });

        return result.text;

    } finally {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}


export async function getYoutubeVideoTranscript(input: string) {
    try {
        const videoId = getYouTubeVideoId(input);

        if (!videoId) {
            throw new Error("INVALID_YOUTUBE_URL");
        }

        const info = await yt.getInfo(videoId);

        const transcriptData = await info.getTranscript();


        const text = transcriptData.transcript;


        if (isLowQuality(text)) {
            throw new Error("LOW_QUALITY");
        }

        return {
            text,
            source: "youtube"
        };
    } catch (error) {
        const videoId = getYouTubeVideoId(input);

        if (!videoId) {
            throw new Error("INVALID_YOUTUBE_URL");
        }

        const text = await whisperFallback(videoId);

        return {
            text
        };
    }
}



async function main() {
    await initYouTube();

    const transcript = await getYoutubeVideoTranscript(
        "https://www.youtube.com/watch?v=W4kNu26KEHg"
    );

    console.log("Transcript:", transcript);
}

main();