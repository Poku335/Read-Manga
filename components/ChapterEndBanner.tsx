"use client";

import { useRouter } from "next/navigation";

interface Props {
  mangaId: number;
  chapterNumber: number;
  nextChapter: { id: number; chapterNumber: number } | null;
}

export default function ChapterEndBanner({ mangaId, chapterNumber, nextChapter }: Props) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-[760px] w-full mt-0 mb-8 px-3 sm:px-0">
      <div className="border border-border rounded-xl bg-surface px-6 py-8 text-center">
        <p className="text-muted text-sm mb-1">— จบตอนที่ {chapterNumber} —</p>
        <p className="text-text font-bold text-base mb-5">
          {nextChapter ? "ตอนถัดไปพร้อมแล้ว!" : "นี่คือตอนล่าสุด"}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {nextChapter && (
            <button
              onClick={() => router.push(`/manga/${mangaId}/chapter/${nextChapter.id}`)}
              className="bg-accent hover:bg-accent-hover text-white text-sm font-bold px-6 py-2.5 rounded-full transition-colors"
            >
              อ่านตอนที่ {nextChapter.chapterNumber}
            </button>
          )}
          <button
            onClick={() => router.push(`/manga/${mangaId}`)}
            className="border border-border hover:border-accent text-muted hover:text-accent text-sm font-medium px-6 py-2.5 rounded-full transition-colors"
          >
            รายการตอน
          </button>
        </div>
      </div>
    </div>
  );
}
