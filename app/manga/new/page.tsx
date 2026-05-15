"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CoverCropModal from "@/components/CoverCropModal";

const GENRES = ["Action", "Fantasy", "Romance", "Sci-Fi", "Comedy", "Horror", "Drama", "Slice of Life"];
const STATUSES = ["Ongoing", "Completed", "Hiatus"];
const MANGA_TYPES = [
  { value: "MANHWA", label: "Manhwa" },
  { value: "MANGA", label: "Manga" },
  { value: "MANHUA", label: "Manhua" },
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewMangaPage() {
  const router = useRouter();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setCoverError(null);
      if (!ALLOWED_TYPES.includes(file.type)) {
        setCoverError("รองรับเฉพาะ JPG, PNG, WebP, GIF");
        return;
      }
      if (file.size > MAX_SIZE) {
        setCoverError(`ไฟล์ใหญ่เกินไป — ${formatBytes(file.size)} (max 5 MB)`);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        if (img.naturalWidth > 400 || img.naturalHeight > 800) {
          if (coverPreview) URL.revokeObjectURL(coverPreview);
          setCoverFile(null);
          setCoverPreview(null);
          setCropSrc(url);
        } else {
          if (coverPreview) URL.revokeObjectURL(coverPreview);
          setCoverFile(file);
          setCoverPreview(url);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); setCoverError("ไม่สามารถโหลดรูปได้"); };
      img.src = url;
    },
    [coverPreview]
  );

  function handleCropConfirm(file: File, previewUrl: string) {
    setCoverFile(file);
    setCoverPreview(previewUrl);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  const removeCover = useCallback(() => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [coverPreview]);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    if (coverFile) data.set("coverImage", coverFile);

    try {
      const res = await fetch("/api/manga", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create manga");
      router.push(`/admin/dashboard/manga/${json.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">เพิ่มมังงะใหม่</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cover upload */}
        <div>
          <label className="block text-sm font-medium mb-2 text-muted">รูปปก</label>
          <div className="flex items-start gap-5">
            {/* Drop zone — portrait 2:3 ratio */}
            <div
              className={[
                "relative w-44 h-64 rounded-lg border-2 overflow-hidden flex-shrink-0 transition-colors",
                coverPreview
                  ? "border-border cursor-default"
                  : "border-dashed cursor-pointer",
                isDragging
                  ? "border-accent bg-accent/10"
                  : coverPreview
                  ? "border-border"
                  : "border-border hover:border-white/30 bg-surface",
              ].join(" ")}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !coverPreview && fileInputRef.current?.click()}
            >
              {coverPreview ? (
                <>
                  <Image src={coverPreview} alt="Cover preview" fill className="object-cover" />
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-xs bg-white/20 hover:bg-white/35 text-white px-4 py-1.5 rounded-full w-28 transition-colors"
                    >
                      เปลี่ยนรูป
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCover();
                      }}
                      className="text-xs bg-red-500/70 hover:bg-red-500 text-white px-4 py-1.5 rounded-full w-28 transition-colors"
                    >
                      ลบรูป
                    </button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 select-none text-muted">
                  {isDragging ? (
                    <>
                      <svg className="w-9 h-9 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <span className="text-xs text-accent font-medium">วางที่นี่</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-9 h-9 opacity-35" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-center leading-relaxed opacity-60 px-3">
                        คลิกหรือลาก<br />รูปมาวาง
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right panel: info + errors */}
            <div className="flex-1 pt-1 space-y-3">
              {coverFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text truncate max-w-xs">{coverFile.name}</p>
                  <p className="text-xs text-muted">{formatBytes(coverFile.size)}</p>
                  <p className="text-xs text-green-400">พร้อมอัปโหลด</p>
                </div>
              ) : (
                <div className="text-xs text-muted leading-relaxed space-y-1">
                  <p>JPG, PNG, WebP, GIF</p>
                  <p>สูงสุด 5 MB</p>
                  <p className="opacity-60">แนะนำ 400 × 600 px (2:3)</p>
                </div>
              )}

              {!coverPreview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-accent hover:text-accent-hover transition-colors underline-offset-2 hover:underline"
                >
                  เลือกไฟล์
                </button>
              )}

              {coverError && (
                <p className="text-xs text-red-400">{coverError}</p>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            name="coverImage"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-muted">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            name="title"
            required
            placeholder="Manga title"
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-white/40 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1.5 text-muted">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Synopsis / description..."
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-white/40 transition-colors resize-none"
          />
        </div>

        {/* Genre + Status + Type */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted">Genre</label>
            <select
              name="genre"
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted">Status</label>
            <select
              name="status"
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted">Type</label>
            <select
              name="type"
              defaultValue="MANHWA"
              className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
            >
              {MANGA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-bg font-semibold px-6 py-2 rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? "กำลังสร้าง..." : "สร้างมังงะ"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-muted text-sm px-4 py-2 hover:text-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {cropSrc && (
        <CoverCropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
      )}
    </div>
  );
}
