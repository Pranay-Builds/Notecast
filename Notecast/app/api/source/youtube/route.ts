import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { callExtract, getExtractApiUrl } from "@/lib/extractApi";
import { NextRequest, NextResponse } from "next/server";

async function attachToNotebook(
  notebookId: string,
  sourceId: string,
  fileUrl: string,
) {
  return prisma.notebookSource.upsert({
    where: {
      notebookId_sourceId: { notebookId, sourceId },
    },
    create: {
      notebookId,
      sourceId,
      fileUrl,
    },
    update: {
      fileUrl,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();

    if (error) return error;

    const userId = session.user?.id;

    try {
      getExtractApiUrl();
    } catch {
      return NextResponse.json(
        { error: "Extraction service is not configured" },
        { status: 503 },
      );
    }


    const { url, notebookId, title, thumbnail } = await req.json();
    

    if (!url || !notebookId) {
      return NextResponse.json(
        { error: "URL and notebookId are required" },
        { status: 400 },
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
        { status: 404 },
      );
    }

    const sourceKey = `youtube:${url}`;

    const cached = await prisma.extractedSource.findUnique({
      where: { sourceKey },
    });

    if (cached) {
      if (cached.status === "failed") {
        return NextResponse.json(
          { error: "Source extraction previously failed" },
          { status: 400 },
        );
      }

      await attachToNotebook(notebookId, cached.id, url);

      return NextResponse.json(
        {
          cached: true,
          source: cached,
        },
        { status: 201 },
      );
    }

    const extractedSource = await prisma.extractedSource.upsert({
      where: { sourceKey },
      create: {
        sourceKey,
        type: "youtube",
        title: title || url,
        thumbnail,
        status: "processing",
      },
      update: {
        status: "processing",
        title: title || url,
        thumbnail,
      },
    });

    try {
      const data = await callExtract({ type: "youtube", url }, 180_000);

      await prisma.extractedSource.update({
        where: { id: extractedSource.id },
        data: {
          content: data.text,
          status: "completed",
        },
      });

      await prisma.sourceChunk.deleteMany({
        where: { sourceId: extractedSource.id },
      });

      if (data.chunks?.length) {
        await prisma.sourceChunk.createMany({
          data: data.chunks.map(
            (chunk: {
              content: string;
              embedding: number[];
              index: number;
            }) => ({
              content: chunk.content,
              embedding: chunk.embedding,
              chunkIndex: chunk.index,
              sourceId: extractedSource.id,
            }),
          ),
        });
      }

      await attachToNotebook(notebookId, extractedSource.id, url);

      const completed = await prisma.extractedSource.findUnique({
        where: { id: extractedSource.id },
      });

      return NextResponse.json(
        {
          source: completed,
        },
        { status: 201 },
      );
    } catch (err) {
      await prisma.extractedSource.update({
        where: { id: extractedSource.id },
        data: { status: "failed" },
      });

      throw err;
    }
  } catch (err) {
    console.error("Error in source/youtube route:", err);

    return NextResponse.json(
      { error: "Failed to save YouTube source" },
      { status: 500 },
    );
  }
}
