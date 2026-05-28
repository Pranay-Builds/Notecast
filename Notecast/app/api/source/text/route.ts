import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { callExtract, getExtractApiUrl } from "@/lib/extractApi";
import { NextRequest, NextResponse } from "next/server";

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

    const { content, notebookId } = await req.json();

    if (!content?.trim() || !notebookId) {
      return NextResponse.json(
        { error: "Content and notebookId are required" },
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

    try {
      const data = await callExtract(
        { type: "text", content: trimmedContent },
        30_000,
      );

      await prisma.extractedSource.update({
        where: { id: extractedSource.id },
        data: {
          content: data.text || trimmedContent,
          status: "completed",
        },
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

      await prisma.notebookSource.create({
        data: {
          notebookId,
          sourceId: extractedSource.id,
        },
      });

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
    console.error("Text source error:", err);

    return NextResponse.json(
      { error: "Failed to save text source" },
      { status: 500 },
    );
  }
}
