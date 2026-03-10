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
        const { url, notebookId, title } = await req.json();

        if (!url || !notebookId) {
            return NextResponse.json(
                { error: "URL and notebookId are required" },
                { status: 400 }
            );
        }

        const notebook = await prisma.notebook.findFirst({
            where: { id: notebookId, userId },
        });

        if (!notebook) {
            return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
        }

        const source = await prisma.source.create({
            data: {
                title: title || url,
                type: "youtube",
                fileUrl: url,
                notebookId,
            },
        });

        return NextResponse.json({ source }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: "Failed to save YouTube source" },
            { status: 500 }
        );
    }
}