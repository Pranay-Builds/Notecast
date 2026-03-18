import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";


export async function DELETE(
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

        // Verify source belongs to a notebook owned by this user
        const source = await prisma.source.findFirst({
            where: {
                id,
                notebook: { userId },
            },
        });

        if (!source) {
            return NextResponse.json({ error: "Source not found" }, { status: 404 });
        }

        await prisma.source.delete({ where: { id: id } });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.log("ERROR IN DELETE SOURCE ROUTE: ", err)
        return NextResponse.json(
            { error: "Failed to delete source" },
            { status: 500 }
        );
    }
}