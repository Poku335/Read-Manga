import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { mangaId, chapterNumber, title, isPaid, price, isHidden } = body;

    if (!mangaId || chapterNumber == null) {
      return NextResponse.json({ error: "mangaId and chapterNumber are required" }, { status: 400 });
    }

    const manga = await prisma.manga.findUnique({ where: { id: mangaId } });
    if (!manga) return NextResponse.json({ error: "Manga not found" }, { status: 404 });

    // Only the manga's author or an admin may add chapters
    if (manga.authorId !== parseInt(user.id) && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const chapter = await prisma.chapter.create({
      data: {
        mangaId,
        chapterNumber: parseFloat(chapterNumber),
        title: title || null,
        isPaid: isPaid ?? false,
        price: price ?? 0,
        isHidden: isHidden ?? false,
      },
    });

    return NextResponse.json({ success: true, data: chapter }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "หมายเลขตอนนี้มีอยู่แล้ว" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
