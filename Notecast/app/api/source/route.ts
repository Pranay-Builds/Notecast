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
        { error: "File or notebookId missing" },
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

    // 🔥 1. Upload to Cloudinary
    const upload = await uploadToCloudinary(file, "sources");

    // 🔥 2. Decide type
    let type: "pdf" | "file" = "file";
    if (file.type === "application/pdf") {
      type = "pdf";
    }

    // 🔥 3. Extract text (only for supported types)
    let text = "";

    if (type === "pdf") {
      const res = await fetch("http://localhost:4000/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "pdf",
          url: upload.secure_url,
        }),
      });

      if (!res.ok) throw new Error("Extraction failed");

      const data = await res.json();
      text = data.text;
    }

    // 🔥 4. Save to DB
    const source = await prisma.source.create({
      data: {
        title: file.name,
        type,
        fileUrl: upload.secure_url,
        content: text,
        notebookId,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
