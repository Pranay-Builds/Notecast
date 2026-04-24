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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, notebookId } = await req.json();

    if (!content?.trim() || !notebookId) {
      return NextResponse.json(
        { error: "Content and notebookId are required" },
        { status: 400 }
      );
    }

    const notebook = await prisma.notebook.findFirst({
      where: { id: notebookId, userId },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 }
      );
    }

    
    const res = await fetch("http://localhost:4000/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "text",
        text: content,
      }),
    });

    if (!res.ok) {
      throw new Error("Text extraction failed");
    }

    const data = await res.json();
    const cleaned = data.text;

    if (!cleaned || cleaned.length < 20) {
      return NextResponse.json(
        { error: "Processed text is too short" },
        { status: 400 }
      );
    }


    const title =
      cleaned.slice(0, 60) + (cleaned.length > 60 ? "..." : "");

    const source = await prisma.source.create({
      data: {
        title,
        type: "text",
        fileUrl: null,
        content: cleaned,
        notebookId,
      },
    });

    return NextResponse.json({ source }, { status: 201 });

  } catch (err) {
    console.error("Text route error:", err);

    return NextResponse.json(
      { error: "Failed to save text source" },
      { status: 500 }
    );
  }
}