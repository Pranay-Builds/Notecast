import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { callExtract, getExtractApiUrl } from "@/lib/extractApi";
import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

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

    const { url, notebookId } = await req.json();

    if (!url?.trim() || !notebookId) {
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

    const sourceKey = `webpage:${url}`;

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

      await prisma.notebookSource.upsert({
        where: {
          notebookId_sourceId: { notebookId, sourceId: cached.id },
        },
        create: {
          notebookId,
          sourceId: cached.id,
          fileUrl: url,
        },
        update: { fileUrl: url },
      });

      return NextResponse.json(
        { cached: true, source: cached },
        { status: 201 },
      );
    }

    const pageController = new AbortController();
    const pageTimeout = setTimeout(() => pageController.abort(), 15_000);

    let pageRes: Response;
    try {
      pageRes = await fetch(url, {
        signal: pageController.signal,
        headers: { "User-Agent": "NotecastBot/1.0" },
      });
    } finally {
      clearTimeout(pageTimeout);
    }

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch webpage" },
        { status: 400 },
      );
    }

    const html = await pageRes.text();
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    const pageText = article?.textContent?.trim() || "";

    if (pageText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract readable content from page" },
        { status: 400 },
      );
    }

    const extractedSource = await prisma.extractedSource.upsert({
      where: { sourceKey },
      create: {
        sourceKey,
        type: "text",
        title: article?.title || url,
        status: "processing",
      },
      update: { status: "processing" },
    });

    try {
      const data = await callExtract(
        { type: "text", content: pageText },
        60_000,
      );

      await prisma.extractedSource.update({
        where: { id: extractedSource.id },
        data: {
          content: data.text || pageText,
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

      await prisma.notebookSource.upsert({
        where: {
          notebookId_sourceId: { notebookId, sourceId: extractedSource.id },
        },
        create: {
          notebookId,
          sourceId: extractedSource.id,
          fileUrl: url,
        },
        update: { fileUrl: url },
      });

      const completed = await prisma.extractedSource.findUnique({
        where: { id: extractedSource.id },
      });

      return NextResponse.json({ source: completed }, { status: 201 });
    } catch (err) {
      await prisma.extractedSource.update({
        where: { id: extractedSource.id },
        data: { status: "failed" },
      });

      throw err;
    }
  } catch (err) {
    console.error("Webpage source error:", err);

    return NextResponse.json(
      { error: "Failed to save webpage source" },
      { status: 500 },
    );
  }
}
