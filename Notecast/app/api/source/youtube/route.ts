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

    const { url, notebookId, title, thumbnail } = await req.json();

    if (!url || !notebookId) {
      return NextResponse.json(
        { error: "URL and notebookId are required" },
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

    const sourceKey = `youtube:${url}`;

    // CHECK GLOBAL CACHE
    const cached = await prisma.extractedSource.findUnique({
      where: {
        sourceKey,
      },
    });

    // IF SOURCE ALREADY EXISTS
    if (cached) {

      // CHECK IF ALREADY ATTACHED TO NOTEBOOK
      const existingNotebookSource =
        await prisma.notebookSource.findUnique({
          where: {
            notebookId_sourceId: {
              notebookId,
              sourceId: cached.id,
            },
          },
        });

      if (existingNotebookSource) {
        return NextResponse.json(
          { error: "Source already added" },
          { status: 400 }
        );
      }

      // ATTACH TO NOTEBOOK
      await prisma.notebookSource.create({
        data: {
          notebookId,
          sourceId: cached.id,
          fileUrl: url,
        },
      });

      return NextResponse.json(
        {
          cached: true,
          source: cached,
        },
        { status: 201 }
      );
    }

    // CREATE PROCESSING SOURCE
    const extractedSource = await prisma.extractedSource.create({
      data: {
        sourceKey,
        type: "youtube",
        title: title || url,
        thumbnail,
        status: "processing",
      },
    });

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 180000);

    try {
      const res = await fetch(
        `${process.env.EXTRACT_API_URL}/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "youtube",
            url,
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        throw new Error("Extraction failed");
      }

      const data = await res.json();

      // UPDATE SOURCE CONTENT
      await prisma.extractedSource.update({
        where: {
          id: extractedSource.id,
        },
        data: {
          content: data.text,
          status: "completed",
        },
      });

      // STORE CHUNKS + EMBEDDINGS
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

      // ATTACH TO NOTEBOOK
      await prisma.notebookSource.create({
        data: {
          notebookId,
          sourceId: extractedSource.id,
          fileUrl: url,
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
    console.error("Error in source/youtube route:", err);

    return NextResponse.json(
      { error: "Failed to save YouTube source" },
      { status: 500 }
    );
  }
}