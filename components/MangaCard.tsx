import Link from "next/link";
import Image from "next/image";

export interface MangaWithMeta {
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

const TYPE_BADGE: Record<string, string> = {
  MANHWA: "MANHWA",
  MANGA: "MANGA",
  MANHUA: "MANHUA",
};

export function thaiRelativeTime(date: Date): string {
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

export default function MangaCard({
  manga,
  readChapterIds,
}: {
  manga: MangaWithMeta;
  readChapterIds?: Set<number>;
}) {
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
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-muted/30">
            📖
          </div>
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
            <span className={`text-[14px] font-medium truncate ${chapterClass(ch1.id)}`}>
              ตอนที่ {ch1.chapterNumber}
            </span>
            <span className="text-[13px] text-muted flex-shrink-0 w-14 text-right">
              {thaiRelativeTime(ch1.createdAt)}
            </span>
          </div>
        )}
        {ch2 && (
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[14px] truncate ${chapterClass(ch2.id)}`}>
              ตอนที่ {ch2.chapterNumber}
            </span>
            <span className="text-[13px] text-muted flex-shrink-0 w-14 text-right">
              {thaiRelativeTime(ch2.createdAt)}
            </span>
          </div>
        )}
        {!ch1 && (
          <span className="text-[14px] text-muted">{manga._count?.chapters ?? 0} ตอน</span>
        )}
      </div>
    </Link>
  );
}
