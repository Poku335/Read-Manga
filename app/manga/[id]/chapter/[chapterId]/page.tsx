export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ChapterPaywall from "@/components/ChapterPaywall";
import ChapterNavigator from "@/components/ChapterNavigator";
import ReaderHeader from "@/components/ReaderHeader";
import PageImage from "@/components/PageImage";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}): Promise<Metadata> {
  const { id, chapterId } = await params;
  const mangaId = parseInt(id);
  const chapId = parseInt(chapterId);
  if (isNaN(mangaId) || isNaN(chapId)) return {};

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapId },
    select: {
      chapterNumber: true,
      title: true,
      manga: { select: { title: true } },
    },
  });

  if (!chapter) return {};

  const title = chapter.title
    ? `${chapter.manga.title} ตอน ${chapter.chapterNumber} - ${chapter.title}`
    : `${chapter.manga.title} ตอน ${chapter.chapterNumber}`;

  return {
    title: `${title} | MangBoh`,
    description: `อ่าน ${title} บน MangBoh`,
  };
}

export default async function ChapterReaderPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  const mangaId = parseInt(id);
  const chapId = parseInt(chapterId);
  if (isNaN(mangaId) || isNaN(chapId)) notFound();

  // Parallel: chapter fetch + auth
  const [chapter, session] = await Promise.all([
    prisma.chapter.findUnique({
      where: { id: chapId },
      include: {
        pages: { orderBy: { pageNumber: "asc" } },
        manga: { include: { author: true } },
      },
    }),
    auth(),
  ]);

  if (!chapter || chapter.mangaId !== mangaId) notFound();

  const user = getSessionUser(session);
  const userId = user?.id ? parseInt(user.id) : null;

  if (chapter.isPaid) {
    const purchase = userId
      ? await prisma.purchase.findUnique({
          where: { userId_chapterId: { userId, chapterId: chapId } },
        })
      : null;

    if (!purchase) {
      const dbUser = user?.email
        ? await prisma.user.findUnique({
            where: { email: user.email },
            select: { coins: true },
          })
        : null;

      return (
        <ChapterPaywall
          chapter={{
            id: chapter.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            price: chapter.price,
          }}
          mangaId={mangaId}
          mangaTitle={chapter.manga.title}
          mangaCover={chapter.manga.coverImage ?? null}
          userCoins={dbUser?.coins ?? 0}
          isLoggedIn={!!user?.email}
        />
      );
    }
  }

  const [prevChapter, nextChapter] = await Promise.all([
    prisma.chapter.findFirst({
      where: { mangaId, chapterNumber: { lt: chapter.chapterNumber } },
      orderBy: { chapterNumber: "desc" },
      select: { id: true, chapterNumber: true },
    }),
    prisma.chapter.findFirst({
      where: { mangaId, chapterNumber: { gt: chapter.chapterNumber } },
      orderBy: { chapterNumber: "asc" },
      select: { id: true, chapterNumber: true },
    }),
    userId
      ? prisma.readingHistory.upsert({
          where: { userId_chapterId: { userId, chapterId: chapId } },
          update: { lastReadAt: new Date() },
          create: { userId, chapterId: chapId },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="-mx-4 -my-6 min-h-screen bg-bg pb-12 text-muted sm:-mx-6 sm:-my-8 lg:-mx-8">
      {/* Prefetch next chapter */}
      {nextChapter && (
        <link
          rel="prefetch"
          href={`/manga/${mangaId}/chapter/${nextChapter.id}`}
        />
      )}

      <main className="mx-auto w-full max-w-[1080px] px-3 py-4 sm:px-0">
        <section className="overflow-hidden bg-surface border border-border rounded-xl shadow-2xl shadow-black/30">
          <ReaderHeader
            mangaId={mangaId}
            mangaTitle={chapter.manga.title}
            chapterNumber={chapter.chapterNumber}
            currentChapterId={chapId}
            prevChapterId={prevChapter?.id ?? null}
            nextChapterId={nextChapter?.id ?? null}
          />

          {/* Reader content */}
          <div
            id="reader-content"
            className="border-b border-border px-3 py-16 sm:px-8"
          >
            <header className="mb-11 text-center">
              <h1 className="text-2xl font-black text-text">
                ตอนที่ {chapter.chapterNumber}
              </h1>
              <p className="mt-1 text-lg font-bold text-muted">
                {chapter.title ? `( ${chapter.title} )` : ""}
              </p>
            </header>

            {chapter.pages.length === 0 ? (
              <div className="mx-auto max-w-sm border border-border bg-bg px-6 py-7 text-center rounded-lg">
                <p className="text-base font-bold text-text">
                  ยังไม่มีหน้าการ์ตูนสำหรับตอนนี้
                </p>
                <Link
                  href={`/manga/${mangaId}/chapter/${chapId}/upload`}
                  className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover transition-colors"
                >
                  อัปโหลดหน้าการ์ตูน
                </Link>
              </div>
            ) : (
              <div className="mx-auto flex max-w-[760px] flex-col items-center">
                {chapter.pages.map((page) => (
                  <PageImage
                    key={page.id}
                    src={page.imagePath}
                    pageNumber={page.pageNumber}
                    priority={page.pageNumber <= 3}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Prev / Next chapter */}
          <section className="px-6 py-8 sm:px-16">
            <ChapterNavigator
              mangaId={mangaId}
              chapterNumber={chapter.chapterNumber}
              currentChapterId={chapId}
              prevChapter={prevChapter}
              nextChapter={nextChapter}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
