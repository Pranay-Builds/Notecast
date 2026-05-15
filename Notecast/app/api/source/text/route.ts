import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const userId = session.user?.id;

    const { content, notebookId } = await req.json();

    if (!content?.trim() || !notebookId) {
      return NextResponse.json(
        { error: "Content and notebookId are required" },
        { status: 400 }
      );
    }

    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId,
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 }
      );
    }

    const trimmedContent = content.trim();

    const title =
      trimmedContent.slice(0, 60) +
      (trimmedContent.length > 60 ? "..." : "");

    

    const sourceKey = `text:${crypto.randomUUID()}`;

    
    const extractedSource = await prisma.extractedSource.create({
      data: {
        sourceKey,
        type: "text",
        title,
        status: "processing",
      },
    });

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {

      const res = await fetch(
        `${process.env.EXTRACT_API_URL}/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "text",
            content: trimmedContent,
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        throw new Error("Extraction failed");
      }

      const data = await res.json();

      // UPDATE CONTENT
      await prisma.extractedSource.update({
        where: {
          id: extractedSource.id,
        },
        data: {
          content: data.text || trimmedContent,
          status: "completed",
        },
      });

      // STORE CHUNKS
      await prisma.sourceChunk.createMany({
        data: data.chunks.map(
          (
            chunk: {
              content: string;
              embedding: number[];
              index: number;
            }
          ) => ({
            content: chunk.content,
            embedding: chunk.embedding,
            chunkIndex: chunk.index,
            sourceId: extractedSource.id,
          })
        ),
      });

  
      await prisma.notebookSource.create({
        data: {
          notebookId,
          sourceId: extractedSource.id,
        },
      });

      return NextResponse.json(
        {
          source: extractedSource,
        },
        { status: 201 }
      );

    } finally {
      clearTimeout(timeout);
    }

  } catch (err) {
    console.error("Text source error:", err);

    return NextResponse.json(
      { error: "Failed to save text source" },
      { status: 500 }
    );
  }
}