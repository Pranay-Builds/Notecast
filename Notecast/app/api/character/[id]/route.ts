import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import { buildCharacterPrompt } from "@/lib/buildCharacterPrompt";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuth();

    if (error) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const userId = session.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existingCharacter = await prisma.character.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCharacter) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();

    const name = formData.get("name") as string | null;
    const role = formData.get("role") as string | null;
    const expertise = formData.get("expertise") as string | null;
    const personality = formData.get("personality") as string | null;
    const speakingStyle = formData.get("speakingStyle") as string | null;
    const goal = formData.get("goal") as string | null;
    const avatar = formData.get("avatar") as File | null;

    let avatarUrl = existingCharacter.avatarUrl;

    if (avatar && avatar.size > 0) {
      const upload = await uploadToCloudinary(avatar, "characters");
      avatarUrl = upload.secure_url;
    }

    const updatedName = name ?? existingCharacter.name;
    const updatedRole = role ?? existingCharacter.role;

    const systemPrompt = buildCharacterPrompt({
      name: updatedName,
      role: updatedRole,
      userName: session.user?.name || "User",
      expertise: expertise ?? existingCharacter.expertise,
      personality: personality ?? existingCharacter.personality,
      speakingStyle: speakingStyle ?? existingCharacter.speakingStyle,
      goal: goal ?? existingCharacter.goal,
    });

    const updatedCharacter = await prisma.character.update({
      where: { id },
      data: {
        name: updatedName,
        role: updatedRole,
        expertise,
        personality,
        speakingStyle,
        goal,
        avatarUrl,
        systemPrompt,
      },
    });

    return NextResponse.json({ character: updatedCharacter }, { status: 200 });

  } catch (err) {
    console.error("Character update error:", err);

    return NextResponse.json(
      { error: "Failed to update character" },
      { status: 500 }
    );
  }
}

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

    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const character = await prisma.character.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    await prisma.character.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Character deleted successfully" },
      { status: 200 }
    );

  } catch (err) {
    console.error("Character delete error:", err);

    return NextResponse.json(
      { error: "Failed to delete character" },
      { status: 500 }
    );
  }
}