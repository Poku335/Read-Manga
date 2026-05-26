export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { incrementView } from "./actions";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import ChapterList from "@/components/ChapterList";
import BookmarkButton from "@/components/BookmarkButton";
import ExpandableDescription from "@/components/ExpandableDescription";
import CommentSection from "@/components/CommentSection";
import RatingWidget from "@/components/RatingWidget";
import type { Metadata } from "next";

const STATUS_STYLES: Record<string, string> = {
  Completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Hiatus: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Ongoing: "bg-accent/20 text-accent border-accent/30",
};

const STATUS_LABELS: Record<string, string> = {
  Completed: "จบแล้ว",
  Hiatus: "หยุดชั่วคราว",
  Ongoing: "กำลังดำเนิน",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mangaId = parseInt(id);
  if (isNaN(mangaId)) return {};
  const manga = await prisma.manga.findUnique({
    where: { id: mangaId },
    select: { title: true, description: true, coverImage: true },
  });
  if (!manga) return {};
  return {
    title: `${manga.title} | MangBoh`,
    description:
      manga.description?.slice(0, 160) || `อ่าน ${manga.title} บน MangBoh`,
    openGraph: {
      title: manga.title,
      description: manga.description?.slice(0, 160) || 'อ่านมังงะออนไลน์',
      images: manga.coverImage ? [{ url: manga.coverImage, width: 400, height: 600 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: manga.title,
      images: manga.coverImage ? [manga.coverImage] : [],
    },
  };
}

export default async function MangaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mangaId = parseInt(id);
  if (isNaN(mangaId)) notFound();

  const session = await auth();
  const user = getSessionUser(session);
  const isAdmin = user?.role === "ADMIN";

  const manga = await prisma.manga.findUnique({
    where: { id: mangaId },
    include: {
      chapters: {
        where: isAdmin ? undefined : { isHidden: false },
        orderBy: { chapterNumber: "desc" },
        include: { _count: { select: { pages: true } } },
      },
    },
  });

  if (!manga) notFound();

  await incrementView(mangaId);

  let purchases: number[] = [];
  let isBookmarked = false;
  let continueChapterId: number | null = null;
  let readChapterIds: number[] = [];

  if (user?.email) {
    const userId = parseInt(user.id);
    const [userPurchases, bookmark, lastRead, readHistory] = await Promise.all([
      prisma.purchase.findMany({
        where: { user: { email: user.email }, chapter: { mangaId } },
        select: { chapterId: true },
      }),
      prisma.bookmark.findUnique({
        where: { userId_mangaId: { userId, mangaId } },
      }),
      prisma.readingHistory.findFirst({
        where: { userId, chapter: { mangaId } },
        orderBy: { lastReadAt: "desc" },
        select: { chapterId: true },
      }),
      prisma.readingHistory.findMany({
        where: { userId, chapter: { mangaId } },
        select: { chapterId: true },
      }),
    ]);

    purchases = userPurchases.map((p) => p.chapterId);
    isBookmarked = Boolean(bookmark);
    continueChapterId = lastRead?.chapterId ?? null;
    readChapterIds = readHistory.map((h) => h.chapterId);
  }

  const currentUserId = user?.id ? parseInt(user.id) : null;
  const commentsRaw = await prisma.comment.findMany({
    where: { mangaId, parentId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, image: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  const initialComments = commentsRaw.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    isGuest: c.isGuest,
    guestName: c.guestName,
    user: c.user
      ? { id: c.user.id, name: c.user.name, image: c.user.image }
      : null,
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      isGuest: r.isGuest,
      guestName: r.guestName,
      user: r.user
        ? { id: r.user.id, name: r.user.name, image: r.user.image }
        : null,
      replies: [],
    })),
  }));

  const firstChapter = manga.chapters[manga.chapters.length - 1];
  const latestChapter = manga.chapters[0];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="relative mb-6">
        {manga.coverImage && (
          <div className="absolute inset-0 -mx-4 -mt-6 h-48 overflow-hidden">
            <Image
              src={manga.coverImage}
              alt=""
              fill
              className="object-cover blur-2xl opacity-20 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg" />
          </div>
        )}

        <div className="relative pt-6 flex gap-5">
          <div className="flex-shrink-0 w-32 sm:w-44">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface border border-border shadow-2xl">
              {manga.coverImage ? (
                <Image
                  src={manga.coverImage}
                  alt={manga.title}
                  fill
                  sizes="(max-width: 640px) 128px, 176px"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-5xl text-muted/40">
                  📚
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[manga.status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}
              >
                {STATUS_LABELS[manga.status] ?? manga.status}
              </span>
              {manga.genre && (
                <span className="text-xs text-muted border border-border rounded-full px-2.5 py-1">
                  {manga.genre}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl font-bold text-text leading-tight mb-1">
              {manga.title}
            </h1>

            {manga.altTitle && (
              <p className="text-sm text-muted mb-2">{manga.altTitle}</p>
            )}

            {manga.description && (
              <ExpandableDescription description={manga.description} />
            )}

            <div className="mb-3">
              <RatingWidget mangaId={mangaId} isLoggedIn={!!user?.email} />
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted mb-4">
              <span className="flex items-center gap-1.5">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                {manga.chapters.length} ตอน
              </span>
              <span className="flex items-center gap-1.5">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {manga.viewCount.toLocaleString()} ครั้ง
              </span>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {continueChapterId ? (
                <Link
                  href={`/manga/${manga.id}/chapter/${continueChapterId}`}
                  className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  อ่านต่อ
                </Link>
              ) : firstChapter ? (
                <Link
                  href={`/manga/${manga.id}/chapter/${firstChapter.id}`}
                  className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  อ่านตอนแรก
                </Link>
              ) : null}

              {latestChapter &&
                latestChapter.id !== firstChapter?.id &&
                latestChapter.id !== continueChapterId && (
                  <Link
                    href={`/manga/${manga.id}/chapter/${latestChapter.id}`}
                    className="border border-border hover:border-accent text-text hover:text-accent text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    ตอนล่าสุด {latestChapter.chapterNumber}
                  </Link>
                )}

              <BookmarkButton
                mangaId={mangaId}
                initialBookmarked={isBookmarked}
              />

              {isAdmin && (
                <Link
                  href={`/admin/dashboard/manga/${mangaId}`}
                  className="border border-border hover:border-accent text-text hover:text-accent text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  จัดการตอน
                </Link>
              )}

              {isAdmin && (
                <Link
                  href={`/manga/${mangaId}/chapter/new`}
                  className="border border-border hover:border-accent text-text hover:text-accent text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  เพิ่มตอน
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-accent rounded-full" />
            <h2 className="text-sm font-bold text-text">รายการตอน</h2>
          </div>
          <span className="text-xs text-muted">
            {manga.chapters.length} ตอน
          </span>
        </div>
        <ChapterList
          chapters={manga.chapters}
          mangaId={manga.id}
          purchases={purchases}
          readChapterIds={readChapterIds}
          userCoins={user?.coins ?? null}
          isAdmin={isAdmin}
          continueChapterId={continueChapterId}
        />
      </div>

      <CommentSection
        mangaId={mangaId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        initialComments={initialComments}
      />
    </div>
  );
}
