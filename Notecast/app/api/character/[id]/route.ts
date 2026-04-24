import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import { buildCharacterPrompt } from "@/lib/buildCharacterPrompt";
import Groq from "groq-sdk"


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


function shouldEnrich({
  name,
  role,
  expertise,
  personality,
  speakingStyle,
  goal,
}: any) {
  let score = 0;

  if (expertise && expertise.length > 20) score++;
  if (personality && personality.length > 30) score++;
  if (speakingStyle && speakingStyle.length > 30) score++;
  if (goal && goal.length > 20) score++;

  const isTooShortName = name.length < 4;
  const isGenericRole = role.length < 10;

  return score < 3 || isTooShortName || isGenericRole;
}

function isMeaningfulChange(oldVal?: string | null, newVal?: string | null) {
  if (newVal === null || newVal === undefined) return false;
  return oldVal?.trim() !== newVal?.trim();
}

function needsReEnrichment(oldChar: any, updates: any) {
  return (
    isMeaningfulChange(oldChar.expertise, updates.expertise) ||
    isMeaningfulChange(oldChar.personality, updates.personality) ||
    isMeaningfulChange(oldChar.speakingStyle, updates.speakingStyle) ||
    isMeaningfulChange(oldChar.goal, updates.goal)
  );
}

async function enrichCharacter(prompt: string) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // cheap + stable
      temperature: 0.4,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Enrichment failed:", err);
    return null;
  }
}


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
      where: { id, userId },
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

    // ------------------ MERGE RAW ------------------
    const updatedName = name ?? existingCharacter.name;
    const updatedRole = role ?? existingCharacter.role;

    const updatedExpertise = expertise ?? existingCharacter.expertise;
    const updatedPersonality =
      personality ?? existingCharacter.personality;
    const updatedSpeakingStyle =
      speakingStyle ?? existingCharacter.speakingStyle;
    const updatedGoal = goal ?? existingCharacter.goal;

    // ------------------ CHECK RE-ENRICH ------------------
    let enrichedData: any = null;

    const shouldReEnrich = needsReEnrichment(existingCharacter, {
      expertise,
      personality,
      speakingStyle,
      goal,
    });

    if (
      shouldReEnrich &&
      shouldEnrich({
        name: updatedName,
        role: updatedRole,
        expertise: updatedExpertise,
        personality: updatedPersonality,
        speakingStyle: updatedSpeakingStyle,
        goal: updatedGoal,
      })
    ) {
      const enrichmentPrompt = `
You are a senior AI character architect.

Convert weak input into a sharp AI persona.

INPUT:
Name: ${updatedName}
Role: ${updatedRole}
Expertise: ${updatedExpertise || "MISSING"}
Personality: ${updatedPersonality || "MISSING"}
Speaking Style: ${updatedSpeakingStyle || "MISSING"}
Goal: ${updatedGoal || "MISSING"}

OUTPUT JSON ONLY:
{
  "expertise": "...",
  "personality": "...",
  "speakingStyle": "...",
  "goal": "..."
}
`;

      enrichedData = await enrichCharacter(enrichmentPrompt);
    }

    // ------------------ FINAL VALUES ------------------
    const finalExpertise =
      enrichedData?.expertise ??
      existingCharacter.enrichedExpertise ??
      updatedExpertise;

    const finalPersonality =
      enrichedData?.personality ??
      existingCharacter.enrichedPersonality ??
      updatedPersonality;

    const finalSpeakingStyle =
      enrichedData?.speakingStyle ??
      existingCharacter.enrichedSpeakingStyle ??
      updatedSpeakingStyle;

    const finalGoal =
      enrichedData?.goal ??
      existingCharacter.enrichedGoal ??
      updatedGoal;

    // ------------------ SYSTEM PROMPT ------------------
    const systemPrompt = buildCharacterPrompt({
      name: updatedName,
      role: updatedRole,
      userName: session.user?.name || "User",
      expertise: finalExpertise,
      personality: finalPersonality,
      speakingStyle: finalSpeakingStyle,
      goal: finalGoal,
    });

    // ------------------ UPDATE ------------------
    const updatedCharacter = await prisma.character.update({
      where: { id },
      data: {
        name: updatedName,
        role: updatedRole,

        expertise: updatedExpertise,
        personality: updatedPersonality,
        speakingStyle: updatedSpeakingStyle,
        goal: updatedGoal,

        avatarUrl,
        systemPrompt,

        enrichedExpertise: enrichedData
          ? enrichedData.expertise
          : existingCharacter.enrichedExpertise,

        enrichedPersonality: enrichedData
          ? enrichedData.personality
          : existingCharacter.enrichedPersonality,

        enrichedSpeakingStyle: enrichedData
          ? enrichedData.speakingStyle
          : existingCharacter.enrichedSpeakingStyle,

        enrichedGoal: enrichedData
          ? enrichedData.goal
          : existingCharacter.enrichedGoal,

        lastEnrichedAt: enrichedData
          ? new Date()
          : existingCharacter.lastEnrichedAt,
      },
    });

    return NextResponse.json(
      { character: updatedCharacter },
      { status: 200 }
    );
  } catch (err) {
    console.error("Character update error:", err);

    return NextResponse.json(
      { error: "Failed to update character" },
      { status: 500 }
    );
  }
};

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