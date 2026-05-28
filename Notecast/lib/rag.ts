import { prisma } from "@/lib/prisma";
import { embedQuery } from "@/lib/extractApi";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function retrieveRelevantChunks(
  notebookId: string,
  query: string,
  topK = 5,
): Promise<string[]> {
  const chunks = await prisma.sourceChunk.findMany({
    where: {
      source: {
        status: "completed",
        notebooks: { some: { notebookId } },
      },
    },
    select: {
      content: true,
      embedding: true,
    },
    take: 200,
  });

  if (chunks.length === 0) return [];

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedQuery(query);
  } catch {
    return [];
  }

  const scored = chunks
    .map((chunk) => {
      const embedding = chunk.embedding as number[];
      if (!Array.isArray(embedding) || embedding.length === 0) return null;
      return {
        content: chunk.content,
        score: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .filter((item): item is { content: string; score: number } => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map((s) => s.content);
}
