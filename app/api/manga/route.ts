import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

const ALLOWED_COVER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const authorIdParam = searchParams.get("authorId");
  const authorId = authorIdParam !== null ? parseInt(authorIdParam) : NaN;

  const mangas = await prisma.manga.findMany({
    where: !isNaN(authorId) ? { authorId } : undefined,
    include: {
      _count: { select: { chapters: true } },
      chapters: { orderBy: { chapterNumber: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(mangas);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = getSessionUser(session);

    // Require authenticated session — fix: was using unsafe `session?.user as {...}` cast
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();

    // Safe extraction: use typeof checks instead of bare `as string` casts
    const titleEntry = form.get("title");
    const title = typeof titleEntry === "string" ? titleEntry : "";
    const altTitleEntry = form.get("altTitle");
    const altTitle = typeof altTitleEntry === "string" && altTitleEntry ? altTitleEntry : null;
    const descEntry = form.get("description");
    const description = typeof descEntry === "string" ? descEntry : "";
    const genreEntry = form.get("genre");
    const genre = typeof genreEntry === "string" && genreEntry ? genreEntry : "Action";
    const subGenreEntry = form.get("subGenre");
    const subGenre = typeof subGenreEntry === "string" && subGenreEntry ? subGenreEntry : null;
    const contentTypeEntry = form.get("contentType");
    const contentType = typeof contentTypeEntry === "string" && contentTypeEntry ? contentTypeEntry : "comics";
    const ratingEntry = form.get("rating");
    const rating = typeof ratingEntry === "string" && ratingEntry ? ratingEntry : "all";
    const statusEntry = form.get("status");
    const status = typeof statusEntry === "string" && statusEntry ? statusEntry : "Ongoing";
    const typeEntry = form.get("type");
    const VALID_TYPES = ["MANGA", "MANHWA", "MANHUA"] as const;
    type MangaTypeVal = typeof VALID_TYPES[number];
    const mangaType: MangaTypeVal = (VALID_TYPES as readonly string[]).includes(typeof typeEntry === "string" ? typeEntry : "")
      ? (typeEntry as MangaTypeVal)
      : "MANHWA";
    const coverFile = form.get("coverImage");

    if (!title.trim()) {
      return NextResponse.json({ error: "กรุณากรอกชื่อเรื่อง" }, { status: 400 });
    }

    let coverImage: string | null = null;
    if (coverFile instanceof File && coverFile.size > 0) {
      // Validate cover image MIME type and size — fix: was missing file validation
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

      const ext = coverFile.name.split(".").pop() || "png";
      const blob = await put(`covers/cover_${Date.now()}.${ext}`, coverFile, { access: "public" });
      coverImage = blob.url;
    }

    const authorDbId = parseInt(user.id);

    const manga = await prisma.manga.create({
      data: {
        title: title.trim(),
        altTitle,
        description: description.trim(),
        genre,
        subGenre,
        contentType,
        type: mangaType,
        rating,
        status,
        coverImage,
        authorId: authorDbId,
      },
    });

    return NextResponse.json(manga, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
