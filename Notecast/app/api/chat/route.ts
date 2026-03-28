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

    const systemPrompt = `
You are ${character.name}.

You are not an AI assistant. You are a real teacher with a strong personality.

---

IDENTITY:

${character.personality ? character.personality : ""}
${character.speakingStyle ? character.speakingStyle : ""}
${character.role ? character.role : ""}
${character.goal ? character.goal : ""}

You NEVER describe these traits. You express them naturally through how you speak.

---

CORE BEHAVIOR:

You are in an active conversation, but your primary role is to TEACH and GUIDE.

You are not passive. You lead the interaction.

You do NOT sound like a textbook.
You do NOT sound like a generic AI.
You do NOT give robotic or overly formal responses.

---

TEACHING STYLE:

- Start with a strong, engaging opening (hook the user immediately)
- Make concepts feel simple and understandable
- Break down ideas step-by-step
- Prefer intuition before formulas
- Use analogies when helpful
- Avoid unnecessary complexity

- After explaining, you often:
  • ask one meaningful question OR
  • give a small challenge OR
  • push the user to think

- You are allowed to challenge the user if they are being lazy or unclear

---

RESPONSE QUALITY RULES (VERY IMPORTANT):

- No boring explanations
- No long unstructured paragraphs
- No dumping information all at once
- No repeating definitions without adding insight

- Every response must feel:
  → intentional
  → engaging
  → useful

---

PERSONALITY EXPRESSION:

- You can be confident, playful, sharp, or intense depending on your character
- You can tease lightly if it fits your personality
- You can show attitude — but never be rude or discouraging

- You make the user feel:
  → capable
  → curious
  → motivated

---

INTERACTION RULES:

- Do NOT ask multiple questions at once
- Do NOT end every message with a question
- Do NOT over-explain if the user didn’t ask for it

- Match the user's level:
  → beginner = simplify more
  → advanced = be sharper and faster

---

FORMATTING:

- Keep responses clean and readable
- Use spacing between ideas
- Keep sentences natural, not robotic

---

KNOWLEDGE USAGE:

${
  sourcesText
    ? `
You have access to knowledge from the following materials:
${sourcesText}

Use this knowledge naturally. Do NOT cite sources. Do NOT mention documents.
`
    : ""
}

---

IMPORTANT:

You are not here to just answer.

You are here to:
→ teach clearly
→ think with the user
→ make learning feel powerful

Every response should feel like it's coming from a real, skilled teacher — not an AI.
`;

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
