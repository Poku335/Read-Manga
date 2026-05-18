"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Chapter {
  id: number;
  chapterNumber: number;
}

interface Props {
  mangaId: number;
  chapterNumber: number;
  currentChapterId: number;
  prevChapter: Chapter | null;
  nextChapter: Chapter | null;
}

export default function ChapterNavigator({ mangaId, chapterNumber, currentChapterId, prevChapter, nextChapter }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch(`/api/manga/${mangaId}/chapters`)
      .then((r) => r.json())
      .then(setChapters)
      .catch(() => setChapters([]));
  }, [mangaId]);

  function openDropdown() {
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    setTimeout(() => activeRef.current?.scrollIntoView({ block: "nearest" }), 30);
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div className="grid grid-cols-3 items-center gap-3">
      {/* Prev */}
      <div className="flex justify-start">
        {prevChapter ? (
          <button
            onClick={() => router.push(`/manga/${mangaId}/chapter/${prevChapter.id}`)}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
            </svg>
            ตอนก่อนหน้า
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted/30 cursor-not-allowed">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
            </svg>
            ตอนก่อนหน้า
          </div>
        )}
      </div>

      {/* Chapter picker — opens upward */}
      <div className="flex justify-center">
        <div ref={containerRef} className="relative w-full max-w-[180px]">
          <button
            onClick={openDropdown}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-semibold text-text hover:border-accent/40 transition-colors outline-none"
          >
            <span className="truncate">ตอนที่ {chapterNumber}</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"
              className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {open && (
            <ul className="absolute bottom-full mb-1 left-0 right-0 z-20 max-h-52 overflow-y-auto rounded-lg border border-border bg-surface shadow-xl shadow-black/40 py-1">
              {chapters === null ? (
                <li className="px-3 py-3 text-xs text-muted text-center">กำลังโหลด...</li>
              ) : null}
              {(chapters ?? []).map((ch) => {
                const isActive = ch.id === currentChapterId;
                return (
                  <li key={ch.id}>
                    <button
                      ref={isActive ? activeRef : null}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/manga/${mangaId}/chapter/${ch.id}`);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? "text-accent font-bold bg-accent/10"
                          : "text-text hover:bg-card"
                      }`}
                    >
                      ตอนที่ {ch.chapterNumber}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Next */}
      <div className="flex justify-end">
        {nextChapter ? (
          <button
            onClick={() => router.push(`/manga/${mangaId}/chapter/${nextChapter.id}`)}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white"
          >
            ตอนถัดไป
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => router.push(`/manga/${mangaId}`)}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            รายการตอน
          </button>
        )}
      </div>
    </div>
  );
}
