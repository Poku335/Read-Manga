export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import RankingSection from "@/components/RankingSection";
import HeroSwapper from "@/components/HeroSwapper";
import MangaCard from "@/components/MangaCard";

interface SearchParams {
  genre?: string;
  status?: string;
  q?: string;
  type?: string;
  offset?: string;
}

async function getTopMangaByHistory(since: Date, take = 5) {
  const rows = await prisma.$queryRaw<{ mangaId: number; cnt: bigint }[]>`
    SELECT c."mangaId", COUNT(*) AS cnt
    FROM "ReadingHistory" rh
    JOIN "Chapter" c ON c.id = rh."chapterId"
    WHERE rh."lastReadAt" >= ${since}
    GROUP BY c."mangaId"
    ORDER BY cnt DESC
    LIMIT ${take}
  `;
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.mangaId);
  const mangas = await prisma.manga.findMany({
    where: { id: { in: ids } },
    include: { _count: { select: { chapters: true } } },
  });
  return rows
    .map((r) => {
      const m = mangas.find((x) => x.id === r.mangaId);
      return m
        ? { id: m.id, title: m.title, coverImage: m.coverImage, count: Number(r.cnt), _count: m._count }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-6 bg-accent rounded-full" />
        <h2 className="text-lg sm:text-xl font-bold text-text tracking-wide">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-sm text-text/55 hover:text-accent transition-colors">
          ดูทั้งหมด
        </Link>
      )}
    </div>
  );
}

const GENRES = ["All", "การ์ตูน", "Action", "Fantasy", "Romance", "Sci-Fi", "Comedy", "Horror", "Drama", "Slice of Life", "Adventure", "Mystery", "Thriller", "Historical"];
const GENRE_LABELS: Record<string, string> = { All: "ทั้งหมด", "การ์ตูน": "การ์ตูน" };
const STATUSES = ["All", "Ongoing", "Completed", "Hiatus"];
const STATUS_FILTER_LABELS: Record<string, string> = { All: "ทุกสถานะ", Ongoing: "กำลังดำเนิน", Completed: "จบแล้ว", Hiatus: "หยุดชั่วคราว" };

const MANGA_INCLUDE = {
  _count: { select: { chapters: true } },
  chapters: { orderBy: { chapterNumber: "desc" as const }, take: 2, select: { id: true, chapterNumber: true, createdAt: true } },
} as const;

const HERO_INCLUDE = {
  _count: { select: { chapters: true } },
  chapters: { orderBy: { chapterNumber: "asc" as const }, take: 1, select: { id: true, chapterNumber: true } },
} as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const rawCat = sp.genre;
  const genre = rawCat && !["All", "การ์ตูน"].includes(rawCat) ? rawCat : undefined;
  const status = sp.status && sp.status !== "All" ? sp.status : undefined;
  const q = sp.q?.trim() || undefined;
  const contentType = rawCat === "การ์ตูน" ? "comics" : sp.type === "comics" ? sp.type : undefined;
  const isFiltered = genre || status || q || contentType;

  if (isFiltered) {
    const PAGE_SIZE = 24;
    const offset = parseInt(sp.offset ?? "0") || 0;

    const raw = await prisma.manga.findMany({
      where: {
        ...(genre ? { genre } : {}),
        ...(status ? { status } : {}),
        ...(q ? { title: { contains: q } } : {}),
        ...(contentType ? { contentType } : {}),
      },
      include: MANGA_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: PAGE_SIZE + 1,
    });

    const hasMore = raw.length > PAGE_SIZE;
    const filteredManga = hasMore ? raw.slice(0, PAGE_SIZE) : raw;

    const pageTitle =
      contentType === "comics" ? "การ์ตูน / มังงะ" :
      q ? `ค้นหา: "${q}"` :
      "ผลการค้นหา";

    return (
      <div>
        <div className="app-panel rounded-lg p-4 mb-6">
          <form method="GET" className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={sp.q || ""}
              placeholder="ค้นหา..."
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-white/40 transition-colors flex-1 min-w-32"
            />
            <select
              name="genre"
              defaultValue={sp.genre || "All"}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
            >
              {GENRES.map((g) => <option key={g} value={g}>{GENRE_LABELS[g] ?? g}</option>)}
            </select>
            <select
              name="status"
              defaultValue={sp.status || "All"}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_FILTER_LABELS[s] ?? s}</option>)}
            </select>
            <button type="submit" className="app-button-primary">
              ค้นหา
            </button>
            <Link href="/" className="text-muted text-sm px-3 py-2 hover:text-text transition-colors flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              ล้าง
            </Link>
          </form>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-accent rounded-full" />
            <h2 className="text-sm font-bold text-text">{pageTitle}</h2>
          </div>
          <span className="text-muted text-xs">
            {offset > 0 ? `${offset + 1}–${offset + filteredManga.length}` : filteredManga.length} เรื่อง
          </span>
        </div>

        {filteredManga.length === 0 ? (
          <div className="text-center py-20 text-muted bg-surface border border-border rounded-xl">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-base font-medium text-text">ไม่พบมังงะ</p>
            <p className="text-sm mt-1 mb-4">ลองปรับคำค้นหาหรือตัวกรอง</p>
            <Link href="/" className="text-accent hover:underline text-sm">ล้างตัวกรองทั้งหมด</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 sm:gap-5">
            {filteredManga.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        )}

        {filteredManga.length > 0 && (
          <div className="flex items-center justify-between mt-8 gap-4">
            {offset > 0 ? (
              <Link
                href={{ query: { ...sp, offset: Math.max(0, offset - 24) } }}
                className="text-sm text-muted hover:text-accent transition-colors"
              >
                ← หน้าก่อน
              </Link>
            ) : <div />}
            {hasMore && (
              <Link
                href={{ query: { ...sp, offset: offset + 24 } }}
                className="text-sm font-semibold text-accent hover:underline"
              >
                ดูเพิ่มเติม →
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

    const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [popularManga, latestManga, totalCount, allTimeRaw, weeklyRanking, monthlyRanking, readHistoryRows, heroConfig] =
    await Promise.all([
      prisma.manga.findMany({ include: MANGA_INCLUDE, orderBy: { viewCount: "desc" }, take: 8 }),
      prisma.manga.findMany({ include: MANGA_INCLUDE, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.manga.count(),
      prisma.manga.findMany({
        orderBy: { viewCount: "desc" },
        take: 10,
        include: { _count: { select: { chapters: true } } },
      }),
      getTopMangaByHistory(oneWeekAgo, 10),
      getTopMangaByHistory(oneMonthAgo, 10),
      userId
        ? prisma.readingHistory.findMany({ where: { userId }, select: { chapterId: true } })
        : Promise.resolve([]),
      prisma.siteConfig.findUnique({ where: { key: "hero_manga_ids" } }),
    ]);

  const readChapterIds = new Set(readHistoryRows.map((h) => h.chapterId));
  const allTimeRanking = allTimeRaw.map((m) => ({ ...m, count: m.viewCount }));

  const heroIds = heroConfig?.value ? heroConfig.value.split(",").map(Number).filter(Boolean) : [];
  const heroSourceIds = heroIds.length > 0 ? heroIds : popularManga.slice(0, 4).map((m) => m.id);
  const heroRaw = await prisma.manga.findMany({
    where: { id: { in: heroSourceIds } },
    include: HERO_INCLUDE,
  });

  const heroImageConfigs = heroSourceIds.length > 0
    ? await prisma.siteConfig.findMany({
        where: { key: { in: heroSourceIds.map((id) => `hero_image_${id}`) } },
      })
    : [];
  const heroImageMap: Record<number, string> = {};
  for (const c of heroImageConfigs) {
    const id = parseInt(c.key.replace("hero_image_", ""));
    if (!isNaN(id)) heroImageMap[id] = c.value;
  }

  const heroMangas = heroSourceIds.flatMap((id) => {
    const m = heroRaw.find((mm) => mm.id === id);
    if (!m) return [];
    return [{ ...m, heroImage: heroImageMap[id] ?? null }];
  });

  if (totalCount === 0) {
    return (
      <div className="text-center py-20 text-muted bg-surface border border-border rounded-xl">
        <p className="text-5xl mb-4">📚</p>
        <p className="text-base font-medium text-text">ยังไม่มีมังงะในระบบ</p>
        <p className="text-sm mt-2">เริ่มเพิ่มมังงะเรื่องแรกได้เลย</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      {heroMangas.length > 0 && <HeroSwapper mangas={heroMangas} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 lg:gap-10 items-start">
        <div className="space-y-10">
          {popularManga.length > 0 && (
            <section>
              <SectionHeader title="มังงะยอดนิยม" href="/?sort=popular" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
                {popularManga.map((manga) => (
                  <MangaCard key={manga.id} manga={manga} readChapterIds={readChapterIds} />
                ))}
              </div>
            </section>
          )}

          {latestManga.length > 0 && (
            <section>
              <SectionHeader title="อัปเดตล่าสุด" href="/?sort=latest" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
                {latestManga.map((manga) => (
                  <MangaCard key={manga.id} manga={manga} readChapterIds={readChapterIds} />
                ))}
              </div>
            </section>
          )}
        </div>

        {(weeklyRanking.length > 0 || monthlyRanking.length > 0 || allTimeRanking.length > 0) && (
          <aside className="lg:sticky lg:top-4">
            <RankingSection
              weeklyRanking={weeklyRanking}
              monthlyRanking={monthlyRanking}
              allTimeRanking={allTimeRanking}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
