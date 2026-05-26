"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

interface Props {
  chapter: { id: number; chapterNumber: number; title?: string | null; price: number };
  mangaId: number;
  mangaTitle: string;
  mangaCover?: string | null;
  userCoins: number;
  isLoggedIn: boolean;
}

export default function ChapterPaywall({ chapter, mangaId, mangaTitle, mangaCover, userCoins, isLoggedIn }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enough = userCoins >= chapter.price;

  async function handleBuy() {
    if (!isLoggedIn) {
      router.push(`/auth/signin?callbackUrl=/manga/${mangaId}/chapter/${chapter.id}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: chapter.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ซื้อไม่สำเร็จ");
      await update();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <div className="sticky top-14 z-40 bg-surface/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4 text-sm text-muted">
          <Link href="/" className="hover:text-accent transition-colors">หน้าแรก</Link>
          <div className="flex items-center gap-2 text-muted/80">
            <Link href={`/manga/${mangaId}`} className="hover:text-accent transition-colors">{mangaTitle}</Link>
            <span>·</span>
            <span>ตอนที่ {chapter.chapterNumber}</span>
          </div>
          <Link href={`/manga/${mangaId}`} className="text-accent font-medium hover:text-accent-hover transition-colors">กลับ</Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-sm w-full page-enter">
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl text-center">
            {mangaCover && (
              <div className="relative w-24 h-32 mx-auto mb-5 rounded-xl overflow-hidden border border-border shadow-lg">
                <Image src={mangaCover} alt={mangaTitle} fill className="object-cover" />
              </div>
            )}

            <span className="inline-flex items-center gap-1.5 bg-gold/15 text-gold text-xs font-bold px-3 py-1.5 rounded-full mb-3">
              🔒 ตอนต้องซื้อ
            </span>
            <h2 className="text-lg font-bold text-text mb-1">{mangaTitle}</h2>
            <p className="text-muted text-sm mb-6">
              ตอนที่ {chapter.chapterNumber}{chapter.title ? ` — ${chapter.title}` : ""}
            </p>

            <div className="bg-bg border border-border rounded-xl p-4 mb-5 space-y-2.5 text-left">
              <div className="flex justify-between items-center">
                <span className="text-muted text-sm">ราคา</span>
                <span className="text-gold font-bold text-base">🪙 {chapter.price}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted text-sm">เหรียญของคุณ</span>
                <span className={`font-bold ${!isLoggedIn ? "text-muted" : enough ? "text-gold" : "text-red-400"}`}>
                  {isLoggedIn ? `🪙 ${userCoins}` : "—"}
                </span>
              </div>
              {isLoggedIn && enough && (
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-muted text-sm">คงเหลือหลังซื้อ</span>
                  <span className="text-text font-medium text-sm">🪙 {userCoins - chapter.price}</span>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            {!isLoggedIn ? (
              <div className="space-y-3">
                <button
                  onClick={handleBuy}
                  className="w-full bg-accent text-white font-semibold px-4 py-3 rounded-full hover:bg-accent-hover transition-all text-sm"
                >
                  🔓 ซื้อและอ่านเลย
                </button>
                <p className="text-muted text-xs text-center">ต้องเข้าสู่ระบบก่อนซื้อ</p>
                <Link href={`/manga/${mangaId}`} className="block text-muted text-sm hover:text-text transition-colors text-center">
                  กลับไปหน้าการ์ตูน
                </Link>
              </div>
            ) : !enough ? (
              <div className="space-y-3">
                <p className="text-red-400 text-sm font-medium">
                  ต้องการเหรียญเพิ่มอีก {chapter.price - userCoins} เหรียญ
                </p>
                <Link
                  href="/topup"
                  className="block w-full bg-accent text-white font-semibold px-4 py-2.5 rounded-full hover:bg-accent-hover transition-colors text-sm text-center"
                >
                  เติมเหรียญ
                </Link>
                <Link href={`/manga/${mangaId}`} className="block text-muted text-sm hover:text-text transition-colors text-center">
                  กลับไปหน้าการ์ตูน
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleBuy}
                  disabled={loading}
                  className="w-full bg-accent text-white font-semibold px-4 py-3 rounded-full hover:bg-accent-hover transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังซื้อ...
                    </span>
                  ) : "🔓 ซื้อและอ่านเลย"}
                </button>
                <Link href={`/manga/${mangaId}`} className="block text-muted text-sm hover:text-text transition-colors text-center">
                  กลับไปหน้าการ์ตูน
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
