import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk";
import fs from "fs";

type TranscribeInput =
    | { type: "file"; path: string }
    | { type: "buffer"; buffer: Buffer; filename: string }


const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});



export async function transcribe(input: TranscribeInput) {
    let fileStream;


    try {
        if (input.type === "file") {
            fileStream = fs.createReadStream(input.path);
        } else if (input.type === "buffer") {
            const tempPath = `/tmp/${Date.now()}-${input.filename}`;
            fs.writeFileSync(tempPath, input.buffer);
            fileStream = fs.createReadStream(tempPath);
        } else {
            throw new Error("UNSUPPORTED_TYPE");
        };


        const response = await groq.audio.transcriptions.create({
            file: fileStream,
            model: "whisper-large-v3",
        });


        return {
            text: response.text
        }
    } catch (error) {
        throw new Error("TRANSCRIPTION_FAILED")
    }
}