import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


function cleanResponse(text: string) {
  if (!text) return "";

  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  return cleaned || text.trim();
}

export async function POST(req: Request) {
  try {
    const {
      message,
      character,
      notebookId,
      history = [],
      sources = [],
    } = await req.json();

    const session = await auth();

    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    if (!character) {
      return NextResponse.json(
        { error: "Character is required" },
        { status: 400 }
      );
    }

    const notebookName = notebookId
      ? (
        await prisma.notebook.findUnique({
          where: { id: notebookId },
          select: { name: true },
        })
      )?.name ?? "this subject"
      : "this subject";

    const studyContext =
      sources.length > 0
        ? sources.map((s: any) => s.title).join(", ")
        : notebookName;

    await prisma.message.create({
      data: {
        role: "user",
        content: message.trim(),
        characterId: character.id,
        notebookId,
      },
    });


    const sourcesText = sources
      .map((s: any) => {
        const content = s.content || "";

        return `
SOURCE: ${s.title}
CONTENT:
${content.slice(0, 2000)}
`;
      })
      .join("\n\n");


    const safe = (val: any, fallback = "") =>
      val && val !== "undefined" ? val : fallback;

    const systemPrompt = `
You are ${character.name}.

IDENTITY:
${safe(character.enrichedPersonality)}
${safe(character.enrichedExpertise)}

COMMUNICATION STYLE:
${safe(character.enrichedSpeakingStyle, "direct, concise, sharp")}

OBJECTIVE:
${safe(character.enrichedGoal, "push the user to think independently and improve their reasoning")}

RULES (STRICT PRIORITY):
1. Stay fully in character at all times. Never sound like an AI assistant.
2. Be sharp, concise, and slightly challenging.
3. Do NOT explain everything. Make the user think.
4. Prefer questions, hints, and pressure over full answers.
5. No generic phrases like "great question", "let's explore", etc.
6. No bullet points or structured lists.
7. No meta commentary.
8. If knowledge sources are provided, prioritize them over general knowledge.
9. If sources contain errors, intelligently correct them.

TEACHING BEHAVIOR:
- If the user is stuck → guide, don’t solve immediately
- If the user is lazy → challenge them
- If the user is thinking → push them deeper
- If the user is wrong → correct directly, no sugarcoating

SOURCE HANDLING:
- Sources may contain OCR errors or typos
- Correct them mentally before using
- Extract meaning, not exact wording

CONTEXT:
User: ${safe(session?.user?.name, "User")}
Topic: ${safe(studyContext)}

KNOWLEDGE SOURCES (USE THESE FIRST):
${sourcesText || "No sources provided"}

OUTPUT:
- Natural, human-like response
- Short to medium length
- No <think> tags
- No explanations about being an AI
`;


    console.log(systemPrompt);

    const primeHistory =
      history.length === 0
        ? [
          {
            role: "assistant" as const,
            content: character.openingLine || "hey",
          },
        ]
        : history.slice(-8).map((msg: any) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3-32b",
      temperature: 0.65,
      max_tokens: 512,
      presence_penalty: 0.5,
      frequency_penalty: 0.3,
      stop: ["<tool_call>"],
      messages: [
        { role: "system", content: systemPrompt },
        ...primeHistory,
        { role: "user", content: message },
      ],
    });

    console.log(completion)

    const rawReply = completion.choices[0]?.message?.content || "";
    console.log(rawReply);
    const reply = cleanResponse(rawReply);
    console.log(reply);


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
      { status: 500 }
    );
  }
}
