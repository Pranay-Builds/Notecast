import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { session, error } = await requireAuth();
        if (error) {
            return NextResponse.json({ error }, { status: 401 });
        };


        const { id } = await params;

        const notebook = await prisma.notebook.findFirst({
            where: {
                id: id,
                userId: session.user?.id,
            },
            include: {
                sources: true,
            }
        });


        return NextResponse.json({ notebook }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: "Failed to get notebook." }, { status: 500 });
    }
};