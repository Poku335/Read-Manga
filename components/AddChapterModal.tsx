"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";

interface AddChapterModalProps {
  mangaId: number;
  prevChapterNumber: number | null;
  totalChapters: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface PageFile {
  name: string;
  preview: string;
  file: File;
}

export default function AddChapterModal({
  mangaId,
  prevChapterNumber,
  totalChapters,
  onClose,
  onSuccess,
}: AddChapterModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [readerMsg, setReaderMsg] = useState("");
  const [pricing, setPricing] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState(10);
  const [publish, setPublish] = useState<"hidden" | "now" | "schedule">("now");
  const [pages, setPages] = useState<PageFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => {
        const na = parseInt(a.name.replace(/\D/g, "") || "0");
        const nb = parseInt(b.name.replace(/\D/g, "") || "0");
        return na !== nb ? na - nb : a.name.localeCompare(b.name);
      });

    const newPages: PageFile[] = arr.map((f) => ({
      name: f.name,
      preview: URL.createObjectURL(f),
      file: f,
    }));

    setPages((prev) => {
      const existing = new Set(prev.map((p) => p.name));
      return [...prev, ...newPages.filter((p) => !existing.has(p.name))];
    });
  }, []);

  async function handleSave() {
    if (!title.trim()) { setError("กรุณากรอกชื่อตอน"); return; }
    if (pages.length === 0) { setError("กรุณาเพิ่มเนื้อหา (รูปภาพ)"); return; }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const nextNum = (prevChapterNumber ?? 0) + 1;
      const chRes = await fetch("/api/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaId,
          chapterNumber: nextNum,
          title,
          isPaid: pricing === "paid",
          price: pricing === "paid" ? price : 0,
          isHidden: publish === "hidden",
        }),
      });
      const chJson = await chRes.json();
      if (!chRes.ok) throw new Error(chJson.error || "ไม่สามารถสร้างตอนได้");

      const chapterId = chJson.data?.id ?? chJson.id;

      for (let i = 0; i < pages.length; i++) {
        const fd = new FormData();
        fd.append("file", pages[i].file);
        fd.append("chapterId", String(chapterId));
        fd.append("pageNumber", String(i + 1));
        const pgRes = await fetch("/api/page", { method: "POST", body: fd });
        if (!pgRes.ok) throw new Error(`อัปโหลดหน้าที่ ${i + 1} ล้มเหลว`);
        setProgress(Math.round(((i + 1) / pages.length) * 100));
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <h2 className="text-base font-bold text-gray-800">เพิ่มตอนการ์ตูนใหม่</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              ตอนก่อนหน้า:{" "}
              <span className="font-medium text-gray-800">
                {prevChapterNumber ? `ตอนที่ ${prevChapterNumber}` : "ไม่มีตอนก่อนหน้า"}
              </span>
            </span>
            <span className="text-gray-500">
              จำนวนตอนทั้งหมด: <span className="font-medium text-gray-800">{totalChapters}</span>
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-gray-700">
                ชื่อตอน<span className="text-red-500 ml-0.5">*</span>
              </label>
              <span className="text-xs text-gray-400">{title.length}/120</span>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="ชื่อตอน"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              เนื้อหา<span className="text-red-500 ml-0.5">*</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                dragging ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpg,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
              </svg>
              <p className="text-sm text-gray-500">
                คลิก หรือลากและวางไฟล์ภาพจากที่นี่ สูงสุดตอนละ <strong className="text-gray-700">100 ไฟล์</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                รองรับเฉพาะไฟล์นามสกุล .jpg .jpeg .png .webp ขนาดไม่เกินไฟล์ละ 20 MB
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                (หากต้องการเลือกลำดับสลาก ให้กรุณาตั้งชื่อภาพเรียงตามลำดับ เช่น 01, 02, 03...)
              </p>
            </div>

            {pages.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">{pages.length} ไฟล์ที่เลือก</p>
                  <button onClick={() => setPages([])} className="text-xs text-red-400 hover:text-red-500 transition-colors">
                    ลบทั้งหมด
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto">
                  {pages.map((p, i) => (
                    <div key={p.name} className="relative aspect-[3/4] rounded overflow-hidden bg-gray-100 group">
                      <Image src={p.preview} alt={`Page ${i + 1}`} fill className="object-cover" />
                      <button
                        onClick={() => setPages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ×
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>กำลังอัปโหลด...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-gray-700">ข้อความถึงนักอ่าน</label>
              <span className="text-xs text-gray-400">{readerMsg.length}/200</span>
            </div>
            <textarea
              value={readerMsg}
              onChange={(e) => setReaderMsg(e.target.value.slice(0, 200))}
              placeholder="ข้อความถึงนักอ่าน"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ตั้งค่าตอน</label>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pricing"
                    checked={pricing === "free"}
                    onChange={() => setPricing("free")}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-gray-700">อ่านฟรี</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pricing"
                    checked={pricing === "paid"}
                    onChange={() => setPricing("paid")}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    กำหนดราคาเหรียญ
                    <span className="text-gray-400 text-xs cursor-help" title="ราคาเป็นเหรียญ">ⓘ</span>
                  </span>
                </label>
                {pricing === "paid" && (
                  <div className="ml-6">
                    <input
                      type="number"
                      min={1}
                      value={price}
                      onChange={(e) => setPrice(parseInt(e.target.value) || 1)}
                      className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-purple-500"
                    />
                    <span className="text-xs text-gray-500 ml-1.5">เหรียญ</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="publish"
                    checked={publish === "hidden"}
                    onChange={() => setPublish("hidden")}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-gray-700">ซ่อน</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="publish"
                    checked={publish === "now"}
                    onChange={() => setPublish("now")}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-gray-700">เผยแพร่ทันที</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="publish"
                    checked={publish === "schedule"}
                    onChange={() => setPublish("schedule")}
                    className="accent-purple-600"
                  />
                  <span className="text-sm text-gray-700">ตั้งเวลาเผยแพร่</span>
                </label>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-red-500 text-center">
            *การกดยกเลิกหรือปิดหน้าต่างจะล้างข้อมูลในแบบฟอร์มนี้ทันที
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5 pt-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 py-2.5 bg-red-400 text-white text-sm font-semibold rounded-full hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={uploading}
            className="flex-1 py-2.5 bg-[#7c3aed] text-white text-sm font-semibold rounded-full hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
          >
            {uploading ? `กำลังอัปโหลด ${progress}%...` : "บันทึกข้อมูล"}
          </button>
        </div>
      </div>
    </div>
  );
}
