"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function NewChapterPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const data = {
      mangaId: parseInt(params.id),
      chapterNumber: parseFloat(
        (form.elements.namedItem("chapterNumber") as HTMLInputElement).value,
      ),
      title:
        (form.elements.namedItem("title") as HTMLInputElement).value || null,
    };

    try {
      const res = await fetch("/api/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create chapter");
      const chapterId = json.data?.id ?? json.id;
      router.push(`/manga/${params.id}/chapter/${chapterId}/upload`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Chapter</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-muted">
            Chapter Number <span className="text-red-400">*</span>
          </label>
          <input
            name="chapterNumber"
            type="number"
            step="0.1"
            min="0"
            required
            placeholder="ตอนที่"
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-white/40 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-muted">
            Chapter Title (optional)
          </label>
          <input
            name="title"
            placeholder="ชื่อตอน"
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-white/40 transition-colors"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-bg font-semibold px-6 py-2 rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create & Upload Pages"}
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
    </div>
  );
}
