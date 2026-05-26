"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Chapter {
  id: number;
  chapterNumber: number;
}

interface Props {
  mangaId: number;
  mangaTitle: string;
  chapterNumber: number;
  currentChapterId: number;
  prevChapterId: number | null;
  nextChapterId: number | null;
}

export default function ReaderHeader({
  mangaId,
  mangaTitle,
  chapterNumber,
  currentChapterId,
  prevChapterId,
  nextChapterId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  async function openModal() {
    setOpen(true);
    if (chapters === null) {
      const res = await fetch(`/api/manga/${mangaId}/chapters`);
      setChapters(await res.json());
    }
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => activeRef.current?.scrollIntoView({ block: "center" }), 50);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={openModal}
            className="flex-shrink-0 text-muted hover:text-text transition-colors"
            aria-label="เลือกตอน"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path strokeLinecap="round" d="M8 6h12M8 12h12M8 18h12" />
              <path strokeLinecap="round" d="M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
          </button>

          <nav className="flex items-center gap-1.5 text-sm font-medium min-w-0">
            <Link href="/" className="flex-shrink-0 text-muted hover:text-text transition-colors">
              หน้าแรก
            </Link>
            <span className="text-border flex-shrink-0">›</span>
            <Link
              href={`/manga/${mangaId}`}
              className="text-muted hover:text-text transition-colors truncate max-w-[100px] sm:max-w-[200px]"
            >
              {mangaTitle}
            </Link>
            <span className="text-border flex-shrink-0">›</span>
            <span className="text-text font-semibold flex-shrink-0">ตอนที่ {chapterNumber}</span>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-muted flex-shrink-0">
          {prevChapterId ? (
            <Link href={`/manga/${mangaId}/chapter/${prevChapterId}`} className="hover:text-text transition-colors" aria-label="ตอนก่อนหน้า">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
              </svg>
            </Link>
          ) : (
            <span className="opacity-25">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
              </svg>
            </span>
          )}
          {nextChapterId ? (
            <Link href={`/manga/${mangaId}/chapter/${nextChapterId}`} className="hover:text-text transition-colors" aria-label="ตอนถัดไป">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ) : (
            <span className="opacity-25">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60 flex flex-col"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-text">รายการตอน</p>
                <p className="text-xs text-muted mt-0.5 truncate max-w-[220px]">{mangaTitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted hover:text-text transition-colors p-1 -mr-1"
                aria-label="ปิด"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ul className="overflow-y-auto flex-1 py-2">
              {chapters === null ? (
                <li className="flex items-center justify-center py-10 text-sm text-muted">กำลังโหลด...</li>
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
                      className={`w-full text-left px-5 py-3 text-sm transition-colors flex items-center justify-between gap-3 ${
                        isActive
                          ? "text-accent font-bold bg-accent/10"
                          : "text-text hover:bg-card"
                      }`}
                    >
                      <span>ตอนที่ {ch.chapterNumber}</span>
                      {isActive && (
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
