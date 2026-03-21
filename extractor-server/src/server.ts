import dotenv from "dotenv";
dotenv.config();
import Fastify from "fastify";
import cors from "@fastify/cors";
import extractRoute from "./routes/extract";


const fastify = Fastify({
    logger: true,
});


async function start() {
    await fastify.register(cors);
    await fastify.register(extractRoute);

    fastify.get("/", async (req, reply) => {
        reply.send("Extraction API running")
    });


    await fastify.listen({
        port: 4000,
        host: "0.0.0.0"
    });
};


start();