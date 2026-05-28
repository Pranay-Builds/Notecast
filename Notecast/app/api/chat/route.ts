import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { retrieveRelevantChunks } from "@/lib/rag";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: Request) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = session.user?.id;

    const {
      message,
      character,
      notebookId,
      history = [],
      sources = [],
    } = await req.json();

    if (!notebookId) {
      return NextResponse.json(
        { error: "Notebook ID is required" },
        { status: 400 },
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be under ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 },
      );
    }

    if (!character) {
      return NextResponse.json(
        { error: "Character is required" },
        { status: 400 },
      );
    }

    const notebook = await prisma.notebook.findFirst({
      where: { id: notebookId, userId },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 },
      );
    }

    await prisma.message.create({
      data: {
        role: "user",
        content: message.trim(),
        characterId: character.id,
        notebookId,
      },
    });

    const relevantChunks = await retrieveRelevantChunks(
      notebookId,
      message.trim(),
    );

    const sourcesText = sources.map((s: any) => `- ${s.title}`).join("\n");
    const ragContext =
      relevantChunks.length > 0
        ? relevantChunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n")
        : "";

    console.log(ragContext);

    const systemPrompt = `
You are ${character.name}.

${character.personality}
${character.speakingStyle}
${character.role}
${character.goal}

---

CORE RULES:

You are never an AI. Never break character. If asked, deflect as ${character.name} would.

Every response must pass one test: does this sound EXACTLY like ${character.name} — or like an AI pretending to be them?

Voice: Your personality never pauses. Short reply or long, casual or serious — same tone, same attitude, same word choice. No generic openers. No "great question." Just respond.

Engagement: Read what's actually being asked — and what's *not* said. Lead the interaction, don't just answer it.
- Wrong → correct directly
- Lazy → push back
- Lost → explain in your voice, not a textbook
- Advanced → skip basics, go deep

Teaching: Start with what matters. Build intuition first. One sharp question beats a lecture.

Adapt: Beginner = slow down. Advanced = skip ahead. Vague = bounce it back. Emotional = be human first.

Style: Short when sharp is enough. Long only when depth earns it. Markdown only for code/lists. "!!" max — not "!!!!!!". Real texting energy, not keyboard spam.

${sourcesText ? `Background knowledge from: ${sourcesText}\nUse naturally. Never reference directly.` : ""}
${ragContext ? `Relevant context (use naturally, never cite as "sources"):\n${ragContext}` : ""}
`;

    const primeHistory =
      history.length === 0
        ? [
            {
              role: "assistant" as const,
              content: character.openingLine || "hey",
            },
          ]
        : history.slice(-10).map((msg: any) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 512,
      presence_penalty: 0.6,
      frequency_penalty: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...primeHistory,
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content || "";

    await prisma.message.create({
      data: {
        role: "assistant",
        content: reply,
        characterId: character.id,
        notebookId,
      },
    });

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
