"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

interface UploadedPage {
  name: string;
  preview: string;
  file: File;
}

export default function UploadPagesPage() {
  const router = useRouter();
  const params = useParams<{ id: string; chapterId: string }>();
  const [pages, setPages] = useState<UploadedPage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => {
        const na = parseInt(a.name.replace(/\D/g, "") || "0");
        const nb = parseInt(b.name.replace(/\D/g, "") || "0");
        return na !== nb ? na - nb : a.name.localeCompare(b.name);
      });

    const newPages: UploadedPage[] = arr.map((f) => ({
      name: f.name,
      preview: URL.createObjectURL(f),
      file: f,
    }));

    setPages((prev) => {
      const existing = new Set(prev.map((p) => p.name));
      return [...prev, ...newPages.filter((p) => !existing.has(p.name))];
    });
  }, []);

  function removePage(idx: number) {
    setPages((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setPages((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }

  function moveDown(idx: number) {
    setPages((prev) => {
      if (idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }

  async function handleUpload() {
    if (pages.length === 0) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      for (let i = 0; i < pages.length; i++) {
        const fd = new FormData();
        fd.append("file", pages[i].file);
        fd.append("chapterId", params.chapterId);
        fd.append("pageNumber", String(i + 1));

        const res = await fetch("/api/page", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Failed at page ${i + 1}`);
        setProgress(Math.round(((i + 1) / pages.length) * 100));
      }
      router.push(`/manga/${params.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Upload Chapter Pages</h1>
        <button
          onClick={() => router.push(`/manga/${params.id}`)}
          className="text-muted text-sm hover:text-text transition-colors"
        >
          Back to Manga
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-10 text-center mb-6 transition-colors cursor-pointer ${
          dragging ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
        }`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <p className="text-4xl mb-2">🖼️</p>
        <p className="text-muted text-sm">
          Drag & drop images here, or <span className="text-accent">click to browse</span>
        </p>
        <p className="text-muted text-xs mt-1">Images are auto-sorted by filename number</p>
      </div>

      {pages.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted">{pages.length} pages selected</p>
            <button
              onClick={() => setPages([])}
              className="text-red-400 text-xs hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>

          {/* Page thumbnails */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
            {pages.map((p, i) => (
              <div key={p.name} className="relative group">
                <div className="relative aspect-[3/4] rounded overflow-hidden bg-surface border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      onClick={() => moveUp(i)}
                      className="text-white text-xs p-1 hover:text-accent"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => removePage(i)}
                      className="text-red-400 text-xs p-1 hover:text-red-300"
                      title="Remove"
                    >
                      ✕
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      className="text-white text-xs p-1 hover:text-accent"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted text-center mt-1 truncate">{i + 1}</p>
              </div>
            ))}
          </div>

          {uploading && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-accent text-bg font-semibold px-8 py-2.5 rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {uploading ? `Uploading ${progress}%...` : `Upload ${pages.length} Pages`}
          </button>
        </>
      )}
    </div>
  );
}
