import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

function mapSourceType(sourceKey: string, type: string) {
  if (sourceKey.startsWith("webpage:")) return "webpage";
  if (type === "youtube") return "youtube";
  if (type === "text" && sourceKey.startsWith("text:")) return "text";
  if (type === "pdf" || type === "doc" || type === "image") return "file";
  return type;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = session.user?.id;
    const { id } = await params;

    const notebook = await prisma.notebook.findFirst({
      where: { id, userId },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 },
      );
    }

    const notebookSources = await prisma.notebookSource.findMany({
      where: { notebookId: id },
      include: {
        source: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const sources = notebookSources.map((ns) => ({
      id: ns.source.id,
      type: mapSourceType(ns.source.sourceKey, ns.source.type),
      title: ns.source.title,
      status: ns.source.status,
      preview: ns.fileUrl || ns.source.thumbnail,
    }));

    return NextResponse.json({ sources });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 },
    );
  }
}
