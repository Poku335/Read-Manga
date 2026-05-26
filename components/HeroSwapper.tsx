"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

interface HeroManga {
  id: number;
  title: string;
  description: string;
  coverImage: string | null;
  heroImage?: string | null;
  viewCount: number;
  _count: { chapters: number };
  chapters: { id: number; chapterNumber: number }[];
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

const INTERVAL_MS = 10_000;

export default function HeroSwapper({ mangas }: { mangas: HeroManga[] }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function goTo(idx: number) {
    if (idx === current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setFading(false);
    }, 300);
  }

  function resetTimer(nextIdx?: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const next = ((nextIdx ?? current) + 1) % mangas.length;
      setFading(true);
      setTimeout(() => {
        setCurrent(next);
        setFading(false);
      }, 300);
    }, INTERVAL_MS);
  }

  useEffect(() => {
    resetTimer(current);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, mangas.length]);

  const manga = mangas[current];
  if (!manga) return null;

  const readHref = manga.chapters[0]
    ? `/manga/${manga.id}/chapter/${manga.chapters[0].id}`
    : `/manga/${manga.id}`;

  return (
    <section className="relative w-full rounded-lg overflow-hidden min-h-[360px] sm:min-h-[430px] flex items-end border border-border bg-card">
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {(manga.heroImage ?? manga.coverImage) ? (
          <Image src={(manga.heroImage ?? manga.coverImage)!} alt="" fill sizes="100vw" className="object-cover opacity-25" priority />
        ) : (
          <div className="absolute inset-0 bg-card" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
        {mangas.map((_, i) => (
          <button
            key={i}
            onClick={() => { goTo(i); resetTimer(i); }}
            aria-label={`สไลด์ ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-5 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/35 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      <div
        className="absolute top-4 left-4 z-20 transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-accent text-white uppercase tracking-widest">
          ยอดนิยมอันดับ {current + 1}
        </span>
      </div>

      <div
        className="relative z-10 flex flex-col sm:flex-row gap-6 sm:gap-8 p-5 sm:p-8 items-start sm:items-end w-full max-w-5xl transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {(manga.heroImage ?? manga.coverImage) && (
          <div className="flex-shrink-0 w-32 sm:w-44 aspect-[2/3] rounded-lg overflow-hidden border border-border shadow-xl">
            <Image
              src={(manga.heroImage ?? manga.coverImage)!}
              alt={manga.title}
              width={208}
              height={312}
              className="object-cover w-full h-full"
              priority
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-[1.05] line-clamp-3 mb-3 max-w-4xl">
            {manga.title}
          </h2>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed line-clamp-3 mb-6 max-w-2xl">
            {manga.description}
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <Link href={readHref} className="app-button-primary px-6 py-3 text-base">
              เริ่มอ่าน
            </Link>
            <Link
              href={`/manga/${manga.id}`}
              className="app-button-secondary border-white/35 bg-transparent px-6 py-3 text-base text-white/85 hover:border-white/70 hover:text-white"
            >
              รายละเอียด
            </Link>
            <span className="flex items-center gap-1.5 text-white/50 text-sm ml-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {formatCount(manga.viewCount)} · {manga._count.chapters} ตอน
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => { const i = (current - 1 + mangas.length) % mangas.length; goTo(i); resetTimer(i); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
        aria-label="ก่อนหน้า"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={() => { const i = (current + 1) % mangas.length; goTo(i); resetTimer(i); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
        aria-label="ถัดไป"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </section>
  );
}
