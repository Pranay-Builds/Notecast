import { FastifyInstance } from "fastify";


export default async function extractRoute(fastify: FastifyInstance) {
    fastify.post("/extract", async (req, reply) => {
        reply.send("blah blah blah");
    });
}