import { FastifyInstance } from "fastify";
import { embedText } from "../lib/embed";

export default async function embedRoute(fastify: FastifyInstance) {
  fastify.post("/embed", async (req, reply) => {
    try {
      const { text } = req.body as { text?: string };

      if (!text?.trim()) {
        return reply.status(400).send({ error: "Missing text" });
      }

      const embedding = await embedText(text.trim());
      return reply.send({ embedding });
    } catch (err) {
      console.error("Embed error:", err);
      return reply.status(500).send({ error: "Embedding failed" });
    }
  });
}
