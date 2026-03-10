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
        const { url, notebookId } = await req.json();

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

        // Attempt to extract a readable title from the page
        let title = url;
        try {
            const res = await fetch(url, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(5000),
            });
            const html = await res.text();
            const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (match?.[1]) title = match[1].trim();
        } catch {
            // fallback to raw URL as title
        }

        const source = await prisma.source.create({
            data: {
                title,
                type: "webpage",
                fileUrl: url,
                notebookId,
            },
        });

        return NextResponse.json({ source }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: "Failed to save webpage source" },
            { status: 500 }
        );
    }
}