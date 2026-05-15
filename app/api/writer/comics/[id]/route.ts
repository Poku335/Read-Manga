import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { put } from "@vercel/blob";

const ALLOWED_COVER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = getSessionUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mangaId = parseInt(id);
  if (isNaN(mangaId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const manga = await prisma.manga.findUnique({
    where: { id: mangaId },
    include: {
      chapters: {
        orderBy: { chapterNumber: "desc" },
        include: { _count: { select: { pages: true } } },
      },
      _count: { select: { chapters: true } },
    },
  });

  if (!manga) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = manga.authorId === parseInt(user.id);
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(manga);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = getSessionUser(session);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mangaId = parseInt(id);
  if (isNaN(mangaId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const manga = await prisma.manga.findUnique({ where: { id: mangaId } });
  if (!manga) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = manga.authorId === parseInt(user.id);
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const title = formData.get("title") as string | null;
  const altTitle = formData.get("altTitle") as string | null;
  const description = formData.get("description") as string | null;
  const genre = formData.get("genre") as string | null;
  const subGenre = formData.get("subGenre") as string | null;
  const status = formData.get("status") as string | null;
  const contentType = formData.get("contentType") as string | null;
  const rating = formData.get("rating") as string | null;
  const coverFile = formData.get("coverImage") as File | null;
  const removeCoverFlag = formData.get("removeCover") === "true";

  let coverImagePath = manga.coverImage;
  if (coverFile instanceof File && coverFile.size > 0) {
    // Validate cover image MIME type and size — fix: was missing file validation on update
    if (!ALLOWED_COVER_MIME_TYPES.includes(coverFile.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Cover image must be JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }
    if (coverFile.size > MAX_COVER_SIZE) {
      return NextResponse.json(
        { error: "Cover image too large. Maximum size is 5 MB." },
        { status: 400 }
      );
    }

    const ext = coverFile.name.split(".").pop() ?? "jpg";
    const blob = await put(`covers/cover_${mangaId}_${Date.now()}.${ext}`, coverFile, { access: "public" });
    coverImagePath = blob.url;
  } else if (removeCoverFlag) {
    coverImagePath = null;
  }

  const updated = await prisma.manga.update({
    where: { id: mangaId },
    data: {
      ...(title ? { title } : {}),
      altTitle: altTitle || null,
      ...(description ? { description } : {}),
      ...(genre ? { genre } : {}),
      subGenre: subGenre || null,
      ...(status ? { status } : {}),
      ...(contentType ? { contentType } : {}),
      ...(rating ? { rating } : {}),
      coverImage: coverImagePath,
    },
  });

  return NextResponse.json(updated);
}
