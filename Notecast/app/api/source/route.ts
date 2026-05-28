import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";
import { callExtract, getExtractApiUrl } from "@/lib/extractApi";
import { NextRequest, NextResponse } from "next/server";

async function attachToNotebook(
  notebookId: string,
  sourceId: string,
  fileUrl?: string,
) {
  return prisma.notebookSource.upsert({
    where: {
      notebookId_sourceId: { notebookId, sourceId },
    },
    create: {
      notebookId,
      sourceId,
      fileUrl,
    },
    update: {
      fileUrl,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();

    if (error) return error;

    const userId = session.user?.id;

    try {
      getExtractApiUrl();
    } catch {
      return NextResponse.json(
        { error: "Extraction service is not configured" },
        { status: 503 },
      );
    }

    const formData = await req.formData();

    const file = formData.get("file") as File;
    const notebookId = formData.get("notebookId") as string;

    if (!file || !notebookId) {
      return NextResponse.json(
        { error: "File or notebookId missing" },
        { status: 400 },
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
        { status: 404 },
      );
    }

    const upload = await uploadToCloudinary(file, "sources");

    const mime = file.type;

    const ALLOWED_MIMES = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "text/plain",
      "text/markdown",
    ];

    if (!ALLOWED_MIMES.includes(mime)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    let type: "pdf" | "doc" | "image" | "text" = "doc";

    if (mime === "application/pdf") type = "pdf";
    else if (mime.includes("word")) type = "doc";
    else if (mime.startsWith("image/")) type = "image";
    else if (mime === "text/plain" || mime === "text/markdown") type = "text";

    const sourceKey = `${type}:${upload.secure_url}`;

    const cached = await prisma.extractedSource.findUnique({
      where: { sourceKey },
    });

    if (cached) {
      if (cached.status === "failed") {
        return NextResponse.json(
          { error: "Source extraction previously failed" },
          { status: 400 },
        );
      }

      try {
        await attachToNotebook(notebookId, cached.id, upload.secure_url);
      } catch (err: any) {
        if (err?.code === "P2002") {
          return NextResponse.json(
            { error: "Source already added" },
            { status: 400 },
          );
        }
        throw err;
      }

      return NextResponse.json(
        {
          cached: true,
          source: cached,
        },
        { status: 201 },
      );
    }

    const extractedSource = await prisma.extractedSource.upsert({
      where: { sourceKey },
      create: {
        sourceKey,
        type,
        title: file.name,
        status: "processing",
      },
      update: {
        status: "processing",
      },
    });

    let extractBody: Record<string, unknown>;

    if (type === "text") {
      const textContent = await file.text();
      extractBody = { type: "text", content: textContent };
    } else {
      extractBody = { type, url: upload.secure_url };
    }

    try {
      const data = await callExtract(extractBody);

      await prisma.extractedSource.update({
        where: { id: extractedSource.id },
        data: {
          content: data.text,
          status: "completed",
        },
      });

      await prisma.sourceChunk.deleteMany({
        where: { sourceId: extractedSource.id },
      });

      if (data.chunks?.length) {
        await prisma.sourceChunk.createMany({
          data: data.chunks.map(
            (chunk: {
              content: string;
              embedding: number[];
              index: number;
            }) => ({
              content: chunk.content,
              embedding: chunk.embedding,
              chunkIndex: chunk.index,
              sourceId: extractedSource.id,
            }),
          ),
        });
      }

      await attachToNotebook(
        notebookId,
        extractedSource.id,
        upload.secure_url,
      );
    } catch (err) {
      await prisma.extractedSource.update({
        where: { id: extractedSource.id },
        data: { status: "failed" },
      });
      console.log(err);
      return NextResponse.json(
        { error: "Extraction failed", source: { ...extractedSource, status: "failed" } },
        { status: 502 },
      );
    }

    const completed = await prisma.extractedSource.findUnique({
      where: { id: extractedSource.id },
    });

    return NextResponse.json(
      {
        source: completed,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Upload error:", err);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
