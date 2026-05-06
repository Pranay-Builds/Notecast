import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireAuth();
    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

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
        { status: 404 },
      );
    }

    const { newCharacterId } = await request.json();

    if (!newCharacterId) {
      return NextResponse.json(
        { error: "Please provide a character to change" },
        { status: 400 },
      );
    }

    const character = await prisma.character.findFirst({
      where: {
        id: newCharacterId,
        userId: session.user?.id,
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 },
      );
    }

    const updatedNotebook = await prisma.notebook.update({
      where: { id },
      data: {
        characterId: newCharacterId,
      },
      include: {
        character: true,
      },
    });

    return NextResponse.json({ notebook: updatedNotebook }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update character." },
      { status: 500 },
    );
  }
}
