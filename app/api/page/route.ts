import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();

    const fileEntry = form.get("file");
    const chapterIdEntry = form.get("chapterId");
    const pageNumberEntry = form.get("pageNumber");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "file is required and must be a file" }, { status: 400 });
    }
    if (typeof chapterIdEntry !== "string" || typeof pageNumberEntry !== "string") {
      return NextResponse.json({ error: "chapterId and pageNumber are required" }, { status: 400 });
    }

    const file = fileEntry;
    const chapterId = parseInt(chapterIdEntry);
    const pageNumber = parseInt(pageNumberEntry);

    if (isNaN(chapterId) || isNaN(pageNumber)) {
      return NextResponse.json({ error: "chapterId and pageNumber must be valid numbers" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported media type. Only JPEG, PNG, WebP, and GIF are allowed." }, { status: 415 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 413 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { manga: { select: { authorId: true } } },
    });
    if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

    // Only the manga's author or an admin may upload pages
    if (chapter.manga.authorId !== parseInt(user.id) && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ext = file.name.split(".").pop() || "png";
    const blob = await put(`pages/ch${chapterId}_p${pageNumber}_${Date.now()}.${ext}`, file, { access: "public" });
    const imagePath = blob.url;

    const page = await prisma.page.upsert({
      where: { chapterId_pageNumber: { chapterId, pageNumber } },
      update: { imagePath },
      create: { chapterId, pageNumber, imagePath },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
