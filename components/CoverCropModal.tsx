"use client";

import { useRef, useState } from "react";

const ASPECT_W = 2;
const ASPECT_H = 3;
const OUT_W = 400;
const OUT_H = 600;
const MAX_IMG_H = 680;

interface Props {
  src: string;
  onConfirm: (file: File, previewUrl: string) => void;
  onCancel: () => void;
}

export default function CoverCropModal({ src, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null);

  const [nat, setNat] = useState({ w: 0, h: 0 });
  // Displayed image bounds relative to container
  const [imgLayout, setImgLayout] = useState({ left: 0, top: 0, width: 0, height: 0 });
  // Crop box top-left relative to image top-left
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [confirming, setConfirming] = useState(false);

  const loaded = nat.w > 0 && imgLayout.width > 0;

  // Crop box display size: 2:3 ratio, fit within image
  const rawH = imgLayout.height * 0.95;
  const rawW = rawH * (ASPECT_W / ASPECT_H);
  const cropH = rawW > imgLayout.width * 0.95 ? imgLayout.width * 0.95 * (ASPECT_H / ASPECT_W) : rawH;
  const cropW = cropH * (ASPECT_W / ASPECT_H);

  function clamp(x: number, y: number) {
    return {
      x: Math.max(0, Math.min(imgLayout.width - cropW, x)),
      y: Math.max(0, Math.min(imgLayout.height - cropH, y)),
    };
  }

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    setNat({ w: img.naturalWidth, h: img.naturalHeight });
    requestAnimationFrame(() => {
      const i = imgRef.current;
      const c = containerRef.current;
      if (!i || !c) return;
      const ir = i.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      const layout = {
        left: ir.left - cr.left,
        top: ir.top - cr.top,
        width: ir.width,
        height: ir.height,
      };
      setImgLayout(layout);
      const h = layout.height * 0.95;
      const w = h * (ASPECT_W / ASPECT_H);
      const fh = w > layout.width * 0.95 ? layout.width * 0.95 * (ASPECT_H / ASPECT_W) : h;
      const fw = fh * (ASPECT_W / ASPECT_H);
      setCropPos({ x: (layout.width - fw) / 2, y: (layout.height - fh) / 2 });
    });
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, cx: cropPos.x, cy: cropPos.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setCropPos(clamp(
      dragRef.current.cx + (e.clientX - dragRef.current.sx),
      dragRef.current.cy + (e.clientY - dragRef.current.sy),
    ));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || nat.w === 0) return;
    setConfirming(true);

    const scaleX = nat.w / imgLayout.width;
    const scaleY = nat.h / imgLayout.height;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    canvas.getContext("2d")!.drawImage(
      img,
      cropPos.x * scaleX,
      cropPos.y * scaleY,
      cropW * scaleX,
      cropH * scaleY,
      0, 0, OUT_W, OUT_H,
    );

    canvas.toBlob((blob) => {
      if (!blob) { setConfirming(false); return; }
      onConfirm(new File([blob], "cover.jpg", { type: "image/jpeg" }), URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  }

  // Crop box absolute position within container
  const boxLeft = imgLayout.left + cropPos.x;
  const boxTop = imgLayout.top + cropPos.y;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl overflow-hidden w-full max-w-[780px] border border-border flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-sm font-bold text-text">เลือกพื้นที่รูปปก</p>
            <p className="text-xs text-muted mt-0.5">ลากกรอบเพื่อเลือกพื้นที่ที่ต้องการ</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted hover:text-text p-1 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          className="relative bg-gray-900 flex items-center justify-center overflow-hidden select-none touch-none flex-1"
          style={{ minHeight: 200 }}
        >
          {/* Full image — fixed, not draggable */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={handleImgLoad}
            style={{
              maxWidth: "100%",
              maxHeight: MAX_IMG_H,
              display: "block",
              opacity: loaded ? 1 : 0,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />

          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Draggable crop frame — outline creates dark overlay outside the box */}
          {loaded && (
            <div
              className="absolute cursor-grab active:cursor-grabbing"
              style={{
                left: boxLeft,
                top: boxTop,
                width: cropW,
                height: cropH,
                outline: "9999px solid rgba(0,0,0,0.60)",
                border: "2px solid rgba(255,255,255,0.85)",
                zIndex: 10,
                boxSizing: "content-box",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Corner L-marks */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white -translate-x-px -translate-y-px" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white translate-x-px -translate-y-px" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white -translate-x-px translate-y-px" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white translate-x-px translate-y-px" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded-lg text-sm text-muted hover:border-accent hover:text-text transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!loaded || confirming}
            className="px-5 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {confirming ? "กำลังครอป..." : "ใช้รูปนี้"}
          </button>
        </div>
      </div>
    </div>
  );
}
