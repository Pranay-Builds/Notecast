import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { NextRequest, NextResponse } from "next/server";

// create notebook
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    let { name, description, characterId } = await request.json();
    if (!name) {
      name = "Untitled Notebook";
    }

    if (!description) {
      description = "";
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Notebook name must be less than 100 characters." },
        { status: 400 },
      );
    }

    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        userId: session.user.id,
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 400 },
      );
    }

    const notebook = await prisma.notebook.create({
      data: {
        name,
        description,
        userId: session.user.id,
        characterId: character.id,
      },
    });

    return NextResponse.json({ notebook }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create notebook." },
      { status: 500 },
    );
  }
}

// get all notebooks
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const notebooks = await prisma.notebook.findMany({
      where: {
        userId: session.user?.id,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notebooks }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
