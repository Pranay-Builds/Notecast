import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import { NextRequest, NextResponse } from "next/server";

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
        { error: "File or notebookId missing" },
        { status: 400 }
      );
    }

    const notebook = await prisma.notebook.findFirst({
      where: {
        id: notebookId,
        userId,
      },
    });

    if (!notebook) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 }
      );
    }

    // UPLOAD FILE
    const upload = await uploadToCloudinary(file, "sources");

    const mime = file.type;

    const ALLOWED_MIMES = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/jpg", "image/png", "image/webp",
      "text/plain", "text/markdown",
    ];

    if (!ALLOWED_MIMES.includes(mime)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    let type: "pdf" | "doc" | "image" | "text" = "doc";

    if (mime === "application/pdf") type = "pdf";
    else if (mime.includes("word")) type = "doc";
    else if (mime.startsWith("image/")) type = "image";
    else if (mime === "text/plain" || mime === "text/markdown") type = "text";


    // GLOBAL CACHE KEY
    const sourceKey = `${type}:${upload.secure_url}`;

    // CHECK CACHE
    const cached = await prisma.extractedSource.findUnique({
      where: {
        sourceKey,
      },
    });

    // CACHE HIT
    if (cached) {

      // CHECK NOTEBOOK DUPLICATE
      const existingNotebookSource =
        await prisma.notebookSource.findUnique({
          where: {
            notebookId_sourceId: {
              notebookId,
              sourceId: cached.id,
            },
          },
        });

      if (existingNotebookSource) {
        return NextResponse.json(
          { error: "Source already added" },
          { status: 400 }
        );
      }

      // ATTACH TO NOTEBOOK
      await prisma.notebookSource.create({
        data: {
          notebookId,
          sourceId: cached.id,
          fileUrl: upload.secure_url,
        },
      });

      return NextResponse.json(
        {
          cached: true,
          source: cached,
        },
        { status: 201 }
      );
    }

    // CREATE SOURCE
    const extractedSource = await prisma.extractedSource.create({
      data: {
        sourceKey,
        type,
        title: file.name,
        status: "processing",
      },
    });

    let extractBody: any;

    if (type === "text") {
      const textContent = await file.text();
      extractBody = { type: "text", content: textContent };
    } else {
      extractBody = { type, url: upload.secure_url };
    }

    const res = await fetch(`${process.env.EXTRACT_API_URL}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extractBody),
    });

    const data = await res.json();

    // UPDATE SOURCE
    await prisma.extractedSource.update({
      where: {
        id: extractedSource.id,
      },
      data: {
        content: data.text,
        status: "completed",
      },
    });

    // STORE CHUNKS
    await prisma.sourceChunk.createMany({
      data: data.chunks.map(
        (
          chunk: {
            content: string;
            embedding: number[];
            index: number;
          }
        ) => ({
          content: chunk.content,
          embedding: chunk.embedding,
          chunkIndex: chunk.index,
          sourceId: extractedSource.id,
        })
      ),
    });

    // ATTACH TO NOTEBOOK
    await prisma.notebookSource.create({
      data: {
        notebookId,
        sourceId: extractedSource.id,
        fileUrl: upload.secure_url,
      },
    });

    return NextResponse.json(
      {
        source: extractedSource,
      },
      { status: 201 }
    );

  } catch (err) {
    console.error("Upload error:", err);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}