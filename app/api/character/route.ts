import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import { buildCharacterPrompt } from "@/lib/buildCharacterPrompt";

export async function POST(req: NextRequest) {
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

        const formData = await req.formData();

        const name = formData.get("name") as string;
        const role = formData.get("role") as string;
        const expertise = formData.get("expertise") as string | null;
        const personality = formData.get("personality") as string | null;
        const speakingStyle = formData.get("speakingStyle") as string | null;
        const goal = formData.get("goal") as string | null;
        const avatar = formData.get("avatar") as File | null;

        if (!name || !role) {
            return NextResponse.json(
                { error: "Name and role are required" },
                { status: 400 }
            );
        }

        let avatarUrl: string | null = null;

        if (avatar && avatar.size > 0) {

            if (avatar.size > 5 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "Avatar must be under 5MB" },
                    { status: 400 }
                );
            }

            const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

            if (!allowedTypes.includes(avatar.type)) {
                return NextResponse.json(
                    { error: "Invalid avatar format" },
                    { status: 400 }
                );
            }

            const upload = await uploadToCloudinary(avatar, "characters");
            avatarUrl = upload.secure_url;
        }

        const systemPrompt = buildCharacterPrompt({
            name,
            role,
            userName: session.user?.name || "User",
            expertise,
            personality,
            speakingStyle,
            goal
        });

        const character = await prisma.character.create({
            data: {
                name,
                role,
                expertise,
                personality,
                speakingStyle,
                goal,
                systemPrompt,
                avatarUrl,
                userId,
            },
        });

        return NextResponse.json({ character }, { status: 201 });

    } catch (err) {
        return NextResponse.json(
            { error: "Failed to create character" },
            { status: 500 }
        );
    }
};


export async function GET(req: NextRequest) {
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

        const characters = await prisma.character.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                role: true,
                expertise: true,
                personality: true,
                avatarUrl: true,
                createdAt: true
            }
        });

        return NextResponse.json({ characters }, { status: 200 });

    } catch (err) {
        console.error(err);

        return NextResponse.json(
            { error: "Failed to fetch characters" },
            { status: 500 }
        );
    }
};