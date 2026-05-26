"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PurchaseModal from "@/components/PurchaseModal";

interface Chapter {
  id: number;
  chapterNumber: number;
  title?: string | null;
  isPaid: boolean;
  price: number;
  createdAt: Date;
  _count: { pages: number };
}

interface ChapterListProps {
  chapters: Chapter[];
  mangaId: number;
  purchases: number[];
  readChapterIds?: number[];
  userCoins: number | null;
  isAdmin: boolean;
  continueChapterId?: number | null;
}

const INITIAL_COUNT = 20;

function formatChapterDate(date: Date): string {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function ChapterList({
  chapters,
  mangaId,
  purchases,
  readChapterIds = [],
  userCoins,
  continueChapterId,
}: ChapterListProps) {
  const router = useRouter();
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showAll, setShowAll] = useState(false);
  const purchaseSet = new Set(purchases);
  const readSet = new Set(readChapterIds);

  const displayedChapters = showAll ? chapters : chapters.slice(0, INITIAL_COUNT);
  const hiddenCount = chapters.length - INITIAL_COUNT;

  function handleChapterClick(chapter: Chapter) {
    if (!chapter.isPaid || purchaseSet.has(chapter.id)) return;
    if (userCoins === null) {
      router.push(`/auth/signin?callbackUrl=/manga/${mangaId}`);
      return;
    }
    setSelectedChapter(chapter);
  }

  return (
    <>
      <div>
        {chapters.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="text-sm">ยังไม่มีตอน</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedChapters.map((chapter) => {
              const isPurchased = purchaseSet.has(chapter.id);
              const canRead = !chapter.isPaid || isPurchased;
              const isCurrent = chapter.id === continueChapterId;
              const isRead = readSet.has(chapter.id);

              return (
                <div
                  key={chapter.id}
                  className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-card ${
                    isCurrent ? "bg-card" : ""
                  } ${!canRead ? "cursor-pointer" : ""}`}
                  onClick={() => handleChapterClick(chapter)}
                >
                  {canRead ? (
                    <Link
                      href={`/manga/${mangaId}/chapter/${chapter.id}`}
                      className="min-w-0 flex-1"
                    >
                      <span className={`text-sm font-medium ${isRead ? "text-accent" : "text-text"}`}>
                        ตอนที่ {chapter.chapterNumber}
                      </span>
                      {chapter.title && (
                        <span className="text-muted text-sm truncate">
                          {" "}
                          — {chapter.title}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <span className="text-text text-sm font-medium">
                        ตอนที่ {chapter.chapterNumber}
                      </span>
                      {chapter.title && (
                        <span className="text-muted text-sm truncate">
                          {" "}
                          — {chapter.title}
                        </span>
                      )}
                      <span className="ml-2 text-gold text-xs font-semibold">
                        {chapter.price} coins
                      </span>
                    </div>
                  )}

                  <span className="hidden sm:block text-xs text-muted flex-shrink-0 ml-4">
                    {formatChapterDate(chapter.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full py-3 text-sm text-muted hover:text-accent transition-colors border-t border-border"
          >
            {showAll ? "แสดงน้อยลง" : `ดูทั้งหมด ${chapters.length} ตอน (${hiddenCount} ตอนที่ซ่อนอยู่)`}
          </button>
        )}
      </div>

      {selectedChapter && (
        <PurchaseModal
          chapter={selectedChapter}
          mangaId={mangaId}
          userCoins={userCoins || 0}
          onClose={() => setSelectedChapter(null)}
        />
      )}
    </>
  );
}
