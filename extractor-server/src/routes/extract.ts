import { FastifyInstance } from "fastify";
import { extractFromPDF } from "../extractors/pdf";
import { extractYoutubeVideoTranscript } from "../extractors/youtube";
import { extractText } from "../extractors/text";
import { extractFromDocxUrl } from "../extractors/docx";
import { extractFromImageUrl } from "../extractors/image";
import { chunkText } from "../utils/chunk";
import { embedText } from "../lib/embed";

type ExtractRequest =
  | { type: "youtube" | "pdf" | "doc" | "image"; url: string }
  | { type: "text"; content: string };

export default async function extractRoute(fastify: FastifyInstance) {
  fastify.post("/extract", async (req, reply) => {
    try {
      const body = req.body as ExtractRequest;

      let text = "";



      if (body.type === "text") {
        if (!body.content?.trim()) {
          return reply.status(400).send({ error: "Missing content" });
        }

        text = extractText(body.content);
      }



      else {
        if (!body.url) {
          return reply.status(400).send({ error: "Missing url" });
        }

        if (body.type === "youtube") {
          const result = await extractYoutubeVideoTranscript(body.url);
          text = result.text;
        }

        else if (body.type === "pdf") {
          text = await extractFromPDF(body.url);
        }

        else if (body.type === "doc") {
          text = await extractFromDocxUrl(body.url);
        }

        else if (body.type === "image") {
          text = await extractFromImageUrl(body.url);
        }

        else {
          return reply.status(400).send({ error: "Unsupported type" });
        }
      }

      const chunks = chunkText(text);


      const embeddedChunks = await Promise.all(
        chunks.map(async (chunk, index) => ({
          content: chunk,
          embedding: await embedText(chunk),
          index,
        }))
      );


      return reply.send({
        text,
        source: body.type,
        chunks: embeddedChunks,
        length: text.length,
        ok: true
      });

    } catch (err) {
      console.error("Extract error:", err);

      return reply.status(500).send({
        error: "Extraction failed",
      });
    }
  });
}