import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id: notebookId } = await context.params;

    const notebook = await prisma.notebook.findFirst({
      where: { id: notebookId, userId: session.user.id },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parseInt(
      searchParams.get("limit") || String(DEFAULT_LIMIT),
      10,
    );
    const limit = Math.min(
      Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT,
      MAX_LIMIT,
    );

    const messages = await prisma.message.findMany({
      where: { notebookId },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        character: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ messages, limit });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}
