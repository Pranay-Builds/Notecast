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

        const notebook = await prisma.notebook.findUnique({
            where: {
                id: id,
                userId: session.user?.id,
            },
            include: {
                sources: true,
                character: true
            }
        });


        return NextResponse.json({ notebook }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ error: "Failed to get notebook." }, { status: 500 });
    }
};


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { session, error } = await requireAuth();
        if (error) {
            return NextResponse.json({ error }, { status: 401 });
        };


        const { id } = await params;

        const notebook = await prisma.notebook.findFirst({
            where: {
                id,
                userId: session.user?.id,
            },
        });

        if (!notebook) {
            return NextResponse.json(
                { error: "Notebook not found" },
                { status: 404 }
            );
        };

        const { name, description } = await request.json();

        if (!name && !description) {
            return NextResponse.json(
                { error: "Nothing to update" },
                { status: 400 }
            );
        };


        if (name && name.length > 100) {
            return NextResponse.json(
                { error: "Name cannot be more than 100 characters" },
                { status: 400 }
            )
        };



        if (description && description.length > 400) {
            return NextResponse.json(
                { error: "Bio cannot be more than 400 characters" },
                { status: 400 }
            )
        };

        const updatedNotebook = await prisma.notebook.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description && { description }),
            },
        });


        return NextResponse.json({ notebook: updatedNotebook }, { status: 200 })
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to update notebook." },
            { status: 500 }
        );
    }
};


export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { session, error } = await requireAuth();
        if (error) {
            return NextResponse.json({ error }, { status: 401 });
        };


        const { id } = await params;

        const notebook = await prisma.notebook.findFirst({
            where: {
                id,
                userId: session.user?.id,
            },
        });

        if (!notebook) {
            return NextResponse.json(
                { error: "Notebook not found" },
                { status: 404 }
            );
        };


        await prisma.notebook.delete({
            where: { id: id }
        });

        return NextResponse.json(
            { message: "Notebook deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to update notebook." },
            { status: 500 }
        );
    }
}