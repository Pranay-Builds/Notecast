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
        { status: 400 },
      );
    }

    const notebook = await prisma.notebook.findFirst({
      where: { id: notebookId, userId },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 },
      );
    }

    const cached = await prisma.source.findFirst({
      where: {
        fileUrl: url,
        content: {
          not: null, // ensure it has extracted content
        },
      },
    });

    
    if (cached) {
      const source = await prisma.source.create({
        data: {
          title: title || cached.title,
          type: "youtube",
          fileUrl: url,
          content: cached.content,
          thumbnail: thumbnail,
          notebookId,
        },
      });

      return NextResponse.json({ source, cached: true }, { status: 201 });
    }

    const existing = await prisma.source.findFirst({
      where: {
        fileUrl: url,
        notebookId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Source already added" },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const res = await fetch("http://localhost:4000/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "youtube",
        url,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Extraction failed");
    }

    const data = await res.json();
    const text = data.text;

    const source = await prisma.source.create({
      data: {
        title: title || url,
        type: "youtube",
        fileUrl: url,
        content: text,
        thumbnail: thumbnail,
        notebookId,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (err) {
    console.error("Error in source/youtube route: ", err);
    return NextResponse.json(
      { error: "Failed to save YouTube source" },
      { status: 500 },
    );
  }
}
