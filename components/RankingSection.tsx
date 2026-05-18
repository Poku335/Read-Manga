"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type RankManga = {
  id: number;
  title: string;
  coverImage: string | null;
  count: number;
  _count: { chapters: number };
};

const RANK_NUM_STYLE = [
  "text-yellow-400 font-black text-2xl w-8 text-center flex-shrink-0",
  "text-gray-300 font-black text-2xl w-8 text-center flex-shrink-0",
  "text-amber-500 font-black text-2xl w-8 text-center flex-shrink-0",
];
const RANK_NUM_FALLBACK = "text-muted font-black text-xl w-8 text-center flex-shrink-0";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function ViewCount({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted flex-shrink-0">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span className="text-xs text-muted">{formatCount(count)}</span>
    </div>
  );
}

function RankList({ items }: { items: RankManga[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
        <p className="text-sm">ยังไม่มีข้อมูล</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((manga, idx) => (
        <Link
          key={manga.id}
          href={`/manga/${manga.id}`}
          className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
        >
          <span className={RANK_NUM_STYLE[idx] ?? RANK_NUM_FALLBACK}>
            {idx + 1}
          </span>

          <div className="relative w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-bg border border-border/50">
            {manga.coverImage ? (
              <Image src={manga.coverImage} alt={manga.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted/30 text-base">📖</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-text text-sm font-semibold truncate group-hover:text-accent transition-colors leading-snug">
              {manga.title}
            </p>
            <p className="text-muted text-xs mt-0.5 truncate">{manga._count.chapters} ตอน</p>
            <ViewCount count={manga.count} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function RankingSection({
  weeklyRanking,
  monthlyRanking,
  allTimeRanking,
}: {
  weeklyRanking: RankManga[];
  monthlyRanking: RankManga[];
  allTimeRanking: RankManga[];
}) {
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: "สัปดาห์", data: weeklyRanking },
    { label: "เดือน", data: monthlyRanking },
    { label: "ตลอดกาล", data: allTimeRanking },
  ];

  const current = tabs[tab];

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col max-h-[780px]">
      {/* Header */}
      <div className="px-4 pt-4 pb-0 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-accent rounded-full flex-shrink-0" />
          <h3 className="text-sm font-bold text-text">มังงะติดอันดับ</h3>
          <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded bg-accent text-white tracking-wider">TOP 10</span>
        </div>
        <div className="flex">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTab(i)}
              className={`relative px-4 py-2.5 text-xs font-semibold transition-colors ${
                i === tab ? "text-accent" : "text-muted hover:text-text"
              }`}
            >
              {t.label}
              {i === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
        <RankList items={current.data} />
      </div>
    </div>
  );
}
