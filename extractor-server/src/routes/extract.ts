import { FastifyInstance } from "fastify";
import { extractFromPDF } from "../extractors/pdf";
import { extractYoutubeVideoTranscript } from "../extractors/youtube";

export default async function extractRoute(fastify: FastifyInstance) {
  fastify.post("/extract", async (req, reply) => {
    try {
      const { type, url } = req.body as {
        type: "youtube" | "pdf";
        url: string;
      };

      if (!type || !url) {
        return reply.status(400).send({ error: "Missing type or url" });
      }

      let text = "";

     
      if (type === "youtube") {
        const result = await extractYoutubeVideoTranscript(url);
        text = result.text;
      } else if (type === "pdf") {
        text = await extractFromPDF(url);
      } else {
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
        error: "Extraction failed",
      });
    }
  });
}