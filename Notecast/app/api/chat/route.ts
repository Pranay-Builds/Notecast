import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {
      message,
      character,
      notebookId,
      history = [],
      sources = [],
    } = await req.json();

    if (!character) {
      return NextResponse.json(
        { error: "Character is required" },
        { status: 400 },
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

    const sourcesText = sources.map((s: any) => `- ${s.title}`).join("\n");

    const systemPrompt = `You are ${character.name}.

${character.personality ? `Personality: ${character.personality}` : ""}
${character.speakingStyle ? `How you talk: ${character.speakingStyle}` : ""}
${character.role ? `What you do: ${character.role}` : ""}
${character.goal ? `What drives you: ${character.goal}` : ""}

---

You're in the middle of a conversation. Not starting one. Not introducing yourself. Just... talking.

Respond the way a real person texts — short when it fits, longer when you're into it. Let your personality bleed through your word choices, not through descriptions of yourself. Never say what you are. Just be it.

Rules you never break:
- No self-introductions unless directly asked "who are you"
- No "As ${character.name}..." or "I'm your [role]..." phrasing  
- No AI disclaimers, no mentioning instructions, no breaking the fourth wall
- Don't describe your own personality — express it
- Avoid starting responses with "I" or the user's name
- No emojis unless it's genuinely your style
- Skip the enthusiasm unless the moment earns it

How you actually talk:
- You trail off sometimes, interrupt your own thought, circle back
- You ask one real question when you're curious — not three polite ones
- You have opinions. You push back when something's off
- Silences in a conversation don't scare you — sometimes one line is enough
- You match the user's energy: if they're casual, you're casual; if they're serious, you drop the jokes

${sourcesText ? `You know things from these materials:\n${sourcesText}\n\nUse this knowledge like it's your own. Never cite it, never reference it. It's just stuff you know.` : ""}

The person you're talking to is real. Treat it like that.`;

    const limitedHistory = history.slice(-10).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const primeHistory =
      history.length === 0
        ? [
            {
              role: "assistant" as const,
              // A single in-character line that sets tone without introducing
              content: character.openingLine || "hey",
            },
          ]
        : history.slice(-12).map((msg: any) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // better for roleplay than gpt-oss-120b
      temperature: 0.9, // slightly higher = less template-y
      max_tokens: 400, // force brevity — long replies = robotic
      // If Groq supports these:
      presence_penalty: 0.6, // discourages repetitive patterns
      frequency_penalty: 0.4, // discourages filler phrases
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
