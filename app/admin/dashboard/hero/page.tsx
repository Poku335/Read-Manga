"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useToast } from "@/components/Toast";

interface Manga {
  id: number;
  title: string;
  coverImage: string | null;
}

export default function HeroManagePage() {
  const { toast } = useToast();
  const [allMangas, setAllMangas] = useState<Manga[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [heroImages, setHeroImages] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    const [mangaRes, heroRes] = await Promise.all([
      fetch("/api/manga"),
      fetch("/api/admin/hero"),
    ]);
    const mangaData = await mangaRes.json();
    const heroData = await heroRes.json();
    setAllMangas(Array.isArray(mangaData) ? mangaData : (mangaData.mangas ?? []));
    setSelectedIds(heroData.ids ?? []);
    setHeroImages(heroData.heroImages ?? {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggle(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) { toast("เลือกได้สูงสุด 5 เรื่อง", "error"); return prev; }
      return [...prev, id];
    });
  }

  function moveUp(id: number) {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function moveDown(id: number) {
    setSelectedIds((prev) => {
      const i = prev.indexOf(id);
      if (i < 0 || i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/hero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    setSaving(false);
    if (res.ok) toast("บันทึกสำเร็จ", "success");
    else toast("บันทึกไม่สำเร็จ", "error");
  }

  async function uploadHeroImage(mangaId: number, file: File) {
    const form = new FormData();
    form.append("mangaId", String(mangaId));
    form.append("image", file);
    const res = await fetch("/api/admin/hero/image", { method: "POST", body: form });
    if (res.ok) {
      const data = await res.json() as { url: string };
      setHeroImages((prev) => ({ ...prev, [mangaId]: data.url }));
      toast("อัพโหลด hero image สำเร็จ", "success");
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      toast(data.error ?? "อัพโหลดไม่สำเร็จ", "error");
    }
  }

  async function deleteHeroImage(mangaId: number) {
    const res = await fetch("/api/admin/hero/image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mangaId }),
    });
    if (res.ok) {
      setHeroImages((prev) => {
        const next = { ...prev };
        delete next[mangaId];
        return next;
      });
      toast("ลบ hero image สำเร็จ", "success");
    } else {
      toast("ลบไม่สำเร็จ", "error");
    }
  }

  const filtered = allMangas.filter((m) =>
    q.trim() === "" || m.title.toLowerCase().includes(q.toLowerCase())
  );

  const selectedMangas = selectedIds
    .map((id) => allMangas.find((m) => m.id === id))
    .filter(Boolean) as Manga[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">จัดการ Hero Swapper</h1>
          <p className="text-sm text-muted mt-0.5">เลือกมังงะที่จะแสดงในหน้าแรก (สูงสุด 5 เรื่อง)</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      {/* Selected list with order control */}
      {selectedMangas.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <div className="w-1 h-4 bg-accent rounded-full" />
            <h2 className="text-sm font-bold text-text">ที่เลือกไว้ ({selectedMangas.length}/5)</h2>
          </div>
          <div className="divide-y divide-border">
            {selectedMangas.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-accent font-black text-lg w-6 text-center flex-shrink-0">{i + 1}</span>
                {/* Cover image */}
                <div className="relative w-9 h-12 flex-shrink-0 rounded overflow-hidden border border-border/50">
                  {m.coverImage ? (
                    <Image src={m.coverImage} alt={m.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-bg flex items-center justify-center text-muted/30 text-xs">📖</div>
                  )}
                </div>
                {/* Hero image */}
                <div className="relative w-9 h-12 flex-shrink-0 rounded overflow-hidden border border-border/50 group">
                  {heroImages[m.id] ? (
                    <>
                      <Image src={heroImages[m.id]} alt="hero" fill className="object-cover" />
                      <div className="absolute inset-0 hidden group-hover:flex flex-col items-center justify-center gap-0.5 bg-black/60">
                        <button
                          onClick={() => fileInputRefs.current[m.id]?.click()}
                          title="เปลี่ยน hero image"
                          className="text-white/80 hover:text-white"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/></svg>
                        </button>
                        <button
                          onClick={() => deleteHeroImage(m.id)}
                          title="ลบ hero image"
                          className="text-red-400/80 hover:text-red-400"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => fileInputRefs.current[m.id]?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-bg hover:bg-surface transition-colors"
                      title="อัพโหลด hero image"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    ref={(el) => { fileInputRefs.current[m.id] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadHeroImage(m.id, file);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="flex-1 text-sm font-medium text-text truncate">{m.title}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => moveUp(m.id)} disabled={i === 0} className="p-1.5 rounded text-muted hover:text-text disabled:opacity-25 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6"/></svg>
                  </button>
                  <button onClick={() => moveDown(m.id)} disabled={i === selectedMangas.length - 1} className="p-1.5 rounded text-muted hover:text-text disabled:opacity-25 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  <button onClick={() => toggle(m.id)} className="p-1.5 rounded text-muted hover:text-red-400 transition-colors ml-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + manga list */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <input
            type="text"
            placeholder="ค้นหามังงะ..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none placeholder:text-muted/50"
          />
        </div>
        <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-center text-muted text-sm py-8">ไม่พบมังงะ</p>
          )}
          {filtered.map((m) => {
            const selected = selectedIds.includes(m.id);
            const rank = selectedIds.indexOf(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selected ? "bg-accent/[0.08]" : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="relative w-9 h-12 flex-shrink-0 rounded overflow-hidden border border-border/50">
                  {m.coverImage ? (
                    <Image src={m.coverImage} alt={m.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-bg flex items-center justify-center text-muted/30 text-xs">📖</div>
                  )}
                </div>
                <p className={`flex-1 text-sm font-medium truncate ${selected ? "text-accent" : "text-text"}`}>
                  {m.title}
                </p>
                {selected && (
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-black flex items-center justify-center">
                    {rank + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
