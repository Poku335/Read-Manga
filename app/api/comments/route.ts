import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { log, getReqMeta } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const mangaId = parseInt(req.nextUrl.searchParams.get("mangaId") ?? "");
  if (isNaN(mangaId)) return NextResponse.json({ error: "mangaId required" }, { status: 400 });

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where: { mangaId, parentId: null },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, image: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    }),
    prisma.comment.count({ where: { mangaId, parentId: null } }),
  ]);

  const mapComment = (c: {
    id: number;
    content: string;
    createdAt: Date;
    isGuest: boolean;
    guestName: string | null;
    user: { id: number; name: string; image: string | null } | null;
    replies?: Array<{
      id: number;
      content: string;
      createdAt: Date;
      isGuest: boolean;
      guestName: string | null;
      user: { id: number; name: string; image: string | null } | null;
    }>;
  }) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    isGuest: c.isGuest,
    guestName: c.guestName,
    user: c.user,
    replies: (c.replies ?? []).map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      isGuest: r.isGuest,
      guestName: r.guestName,
      user: r.user,
      replies: [],
    })),
  });

  const data = comments.map(mapComment);

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`comment:${getIP(req)}`, 20, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const session = await auth();
  const user = getSessionUser(session);
  const { mangaId, content, guestName, guestEmail, parentId } = await req.json();

  if (!mangaId || !content?.trim()) {
    return NextResponse.json({ error: "mangaId and content required" }, { status: 400 });
  }

  const trimmed = content.trim().slice(0, 1000).replace(/[<>]/g, (c: string) => (c === "<" ? "&lt;" : "&gt;"));
  const parsedMangaId = parseInt(mangaId);

  const mangaExists = await prisma.manga.findUnique({ where: { id: parsedMangaId }, select: { id: true } });
  if (!mangaExists) {
    return NextResponse.json({ error: "Manga not found" }, { status: 404 });
  }

  let resolvedParentId: number | null = null;
  if (parentId != null) {
    const parent = await prisma.comment.findUnique({ where: { id: parseInt(parentId) } });
    if (!parent || parent.mangaId !== parsedMangaId) {
      return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
    }
    resolvedParentId = parent.id;
  }

  const includeClause = {
    user: { select: { id: true, name: true, image: true } },
    replies: {
      orderBy: { createdAt: "asc" as const },
      include: { user: { select: { id: true, name: true, image: true } } },
    },
  };

  const { ip, userAgent } = getReqMeta(req);

  if (user) {
    const comment = await prisma.comment.create({
      data: {
        userId: parseInt(user.id),
        mangaId: parsedMangaId,
        content: trimmed,
        isGuest: false,
        parentId: resolvedParentId,
      },
      include: includeClause,
    });
    await log({ userId: parseInt(user.id), type: "ACTIVITY", action: "post_comment", meta: { mangaId: parsedMangaId, commentId: comment.id }, ip, userAgent });
    return NextResponse.json(
      {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        isGuest: comment.isGuest,
        guestName: comment.guestName,
        user: comment.user,
        replies: [],
      },
      { status: 201 }
    );
  } else {
    const name =
      typeof guestName === "string" && guestName.trim()
        ? guestName.trim().slice(0, 50)
        : "ผู้เยี่ยมชม";
    const email =
      typeof guestEmail === "string" && guestEmail.trim()
        ? guestEmail.trim().slice(0, 100)
        : null;

    const comment = await prisma.comment.create({
      data: {
        userId: null,
        mangaId: parsedMangaId,
        content: trimmed,
        guestName: name,
        guestEmail: email,
        isGuest: true,
        parentId: resolvedParentId,
      },
      include: includeClause,
    });
    return NextResponse.json(
      {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        isGuest: comment.isGuest,
        guestName: comment.guestName,
        user: comment.user,
        replies: [],
      },
      { status: 201 }
    );
  }
}
