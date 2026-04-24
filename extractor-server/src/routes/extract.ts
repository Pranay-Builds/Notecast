import { FastifyInstance } from "fastify";
import { extractFromPDF } from "../extractors/pdf";
import { extractYoutubeVideoTranscript } from "../extractors/youtube";
import { extractFromImage } from "../extractors/image";
import { extractFromText } from "../extractors/text";
import { extractFromDocx } from "../extractors/docx";

export default async function extractRoute(fastify: FastifyInstance) {
  fastify.post("/extract", async (req, reply) => {
    try {
      const { type, url, text: inputText } = req.body as {
        type: "youtube" | "pdf" | "image" | "text" | "docx";
        url?: string;
        text?: string;
      };

      if (!type) {
        return reply.status(400).send({ error: "Missing type" });
      }

      let text = "";

      switch (type) {
        case "youtube": {
          if (!url) throw new Error("Missing url");
          const result = await extractYoutubeVideoTranscript(url);
          text = result.text;
          break;
        }

        case "pdf": {
          if (!url) throw new Error("Missing url");
          text = await extractFromPDF(url);
          break;
        }

        case "image": {
          if (!url) throw new Error("Missing url");
          text = await extractFromImage(url);
          break;
        }

        case "docx": {
          if (!url) throw new Error("Missing url");
          text = await extractFromDocx(url);
          break;
        }

        case "text": {
          if (!inputText) throw new Error("Missing text input");
          text = await extractFromText(inputText);
          break;
        }

        default:
          return reply.status(400).send({ error: "Unsupported type" });
      }

      return reply.send({
        text,
        source: type,
        length: text.length,
      });

    } catch (err) {
      console.error("Extract error:", err);

      return reply.status(500).send({
        error: err instanceof Error ? err.message : "Extraction failed",
      });
    }
  });
}