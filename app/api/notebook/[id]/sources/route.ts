import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { session, error } = await requireAuth();

        if (error) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const userId = session.user?.id;
        const { id } = await params;

        // Verify notebook belongs to user
        const notebook = await prisma.notebook.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!notebook) {
            return NextResponse.json(
                { error: "Notebook not found" },
                { status: 404 }
            );
        }

        const sources = await prisma.source.findMany({
            where: {
                notebookId: id,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ sources });

    } catch (err) {
        return NextResponse.json(
            { error: "Failed to fetch sources" },
            { status: 500 }
        );
    }
};
