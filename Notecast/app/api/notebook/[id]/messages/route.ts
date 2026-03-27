import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireAuth();

    if (error || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: notebookId } = await context.params;

    // 🔒 Ensure notebook belongs to user
    const notebook = await prisma.notebook.findUnique({
      where: { id: notebookId },
    });

    if (!notebook || notebook.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 },
      );
    }

    // 🔥 Fetch messages
    const messages = await prisma.message.findMany({
      where: {
        notebookId,
      },
      orderBy: {
        createdAt: "asc", // oldest → newest
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 },
    );
  }
}
