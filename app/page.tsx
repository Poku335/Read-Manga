export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import RankingSection from "@/components/RankingSection";
import HeroSwapper from "@/components/HeroSwapper";

interface SearchParams {
  genre?: string;
  status?: string;
  q?: string;
  type?: string;
}

interface MangaWithMeta {
  id: number;
  title: string;
  description: string;
  coverImage: string | null;
  status: string;
  type: string;
  viewCount: number;
  _count: { chapters: number };
  chapters: { id: number; chapterNumber: number; createdAt: Date }[];
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

async function getTopMangaByHistory(since: Date, take = 5) {
  const history = await prisma.readingHistory.findMany({
    where: { lastReadAt: { gte: since } },
    select: { chapter: { select: { mangaId: true } } },
  });
  const countMap = new Map<number, number>();
  for (const h of history) {
    const mid = h.chapter.mangaId;
    countMap.set(mid, (countMap.get(mid) ?? 0) + 1);
  }
  const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);
  if (sorted.length === 0) return [];
  const topIds = sorted.map(([id]) => id);
  const mangas = await prisma.manga.findMany({
    where: { id: { in: topIds } },
    include: { _count: { select: { chapters: true } } },
  });
  return sorted
    .map(([id, count]) => {
      const m = mangas.find((x) => x.id === id);
      return m ? { id: m.id, title: m.title, coverImage: m.coverImage, count, _count: m._count } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function thaiRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 60) return `${Math.max(1, minutes)} นาที`;
  if (hours < 24) return `${hours} ชม.`;
  if (days < 7) return `${days} วัน`;
  if (weeks < 5) return `${weeks} สัปดาห์`;
  if (months < 12) return `${months} เดือน`;
  return `${Math.floor(months / 12)} ปี`;
}

const TYPE_BADGE: Record<string, string> = {
  MANHWA: "MANHWA",
  MANGA: "MANGA",
  MANHUA: "MANHUA",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    Completed: { label: "จบ", cls: "bg-emerald-500/90 text-white" },
    Ongoing:   { label: "ดำเนิน", cls: "bg-accent/90 text-white" },
    Hiatus:    { label: "หยุด", cls: "bg-yellow-500/90 text-black" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-500/90 text-white" };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.cls}`}>
      {s.label}
    </span>
  );
}

function MangaCard({ manga, readChapterIds }: { manga: MangaWithMeta; readChapterIds?: Set<number> }) {
  const [ch1, ch2] = manga.chapters ?? [];
  const typeLabel = TYPE_BADGE[manga.type] ?? manga.type;

  function chapterClass(chId: number) {
    if (!readChapterIds) return "text-muted";
    return readChapterIds.has(chId) ? "text-accent" : "text-muted";
  }

  return (
    <Link href={`/manga/${manga.id}`} className="group block">
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-surface border border-border mb-2">
        {manga.coverImage ? (
          <Image
            src={manga.coverImage}
            alt={manga.title}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-muted/30">📖</div>
        )}
        <span className="absolute top-1.5 right-1.5 text-[13px] font-bold px-2 py-1 rounded bg-teal-500 text-white leading-none">
          {typeLabel}
        </span>
      </div>

      <h3 className="text-[16px] font-bold line-clamp-2 leading-snug group-hover:text-accent transition-colors text-text">
        {manga.title}
      </h3>

      <div className="mt-1 space-y-0.5">
        {ch1 && (
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[14px] font-medium truncate ${chapterClass(ch1.id)}`}>ตอนที่ {ch1.chapterNumber}</span>
            <span className="text-[13px] text-muted flex-shrink-0 w-14 text-right">{thaiRelativeTime(ch1.createdAt)}</span>
          </div>
        )}
        {ch2 && (
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[14px] truncate ${chapterClass(ch2.id)}`}>ตอนที่ {ch2.chapterNumber}</span>
            <span className="text-[13px] text-muted flex-shrink-0 w-14 text-right">{thaiRelativeTime(ch2.createdAt)}</span>
          </div>
        )}
        {!ch1 && (
          <span className="text-[14px] text-muted">{manga._count?.chapters ?? 0} ตอน</span>
        )}
      </div>
    </Link>
  );
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

// Cast helper: Prisma's inferred type from MANGA_INCLUDE does not carry description
// because MANGA_INCLUDE uses `include` (not `select`), so all scalar fields are included automatically.
// The cast to MangaWithMeta[] is valid.

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
    const filteredManga = await prisma.manga.findMany({
      where: {
        ...(genre ? { genre } : {}),
        ...(status ? { status } : {}),
        ...(q ? { title: { contains: q } } : {}),
        ...(contentType ? { contentType } : {}),
      },
      include: MANGA_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

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
          <span className="text-muted text-xs">{filteredManga.length} เรื่อง</span>
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
      </div>
    );
  }

  // Home page: run all queries in parallel
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
        {/* Left column: popular + latest stacked (same column width = same card size) */}
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

        {/* Right column: ranking — stretches to full height of left column */}
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
