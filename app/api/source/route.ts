import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import { NextResponse, NextRequest } from "next/server";


export async function POST(req: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const userId = session.user?.id;

        const formData = await req.formData();

        const file = formData.get("file") as File;
        const notebookId = formData.get("notebookId") as string;


        if (!file || !notebookId) {
            return NextResponse.json(
                { error: "Either file or notebook ID not found" },
                { status: 400 }
            );
        };


        const notebook = await prisma.notebook.findFirst({
            where: {
                userId,
                id: notebookId
            }
        });

        if (!notebook) {
            return NextResponse.json(
                { error: "Notebook not found" },
                { status: 404 }
            );
        };


        const upload = await uploadToCloudinary(file, "sources");


        const source = await prisma.source.create({
            data: {
                title: file.name,
                type: "file",
                fileUrl: upload.secure_url,
                notebookId
            }
        });


        return NextResponse.json({ source }, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: "Either file or notebook ID not found" },
            { status: 400 }
        );
    }
};
