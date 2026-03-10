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
            where: { id: notebookId, userId },
        });

        if (!notebook) {
            return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
        }

        const title =
            content.trim().slice(0, 60) + (content.trim().length > 60 ? "..." : "");

        const source = await prisma.source.create({
            data: {
                title,
                type: "text",
                // Store raw text content in fileUrl or add a `content` field to your schema
                fileUrl: null,
                content: content.trim(),
                notebookId,
            },
        });

        return NextResponse.json({ source }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: "Failed to save text source" },
            { status: 500 }
        );
    }
}