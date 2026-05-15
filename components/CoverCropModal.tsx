"use client";

import { useRef, useState, useEffect } from "react";

const CROP_W = 240;
const CROP_H = 360;
const CONTAINER_H = 480;
const OUT_W = 400;
const OUT_H = 600;

function clampOffset(ox: number, oy: number, z: number, natW: number, natH: number) {
  const maxOX = Math.max(0, (natW * z - CROP_W) / 2);
  const maxOY = Math.max(0, (natH * z - CROP_H) / 2);
  return {
    x: Math.max(-maxOX, Math.min(maxOX, ox)),
    y: Math.max(-maxOY, Math.min(maxOY, oy)),
  };
}

interface Props {
  src: string;
  onConfirm: (file: File, previewUrl: string) => void;
  onCancel: () => void;
}

export default function CoverCropModal({ src, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const [containerW, setContainerW] = useState(380);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (containerRef.current) setContainerW(containerRef.current.offsetWidth);
  }, []);

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const natural = { w: img.naturalWidth, h: img.naturalHeight };
    setNat(natural);
    const initZoom = Math.max(CROP_W / natural.w, CROP_H / natural.h);
    setMinZoom(initZoom);
    setZoom(initZoom);
    setOffset({ x: 0, y: 0 });
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, zoom, nat.w, nat.h));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const newZoom = Math.max(minZoom, Math.min(4, zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
    setZoom(newZoom);
    setOffset(clampOffset(offset.x, offset.y, newZoom, nat.w, nat.h));
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || nat.w === 0) return;
    setConfirming(true);

    const imgLeft = containerW / 2 + offset.x - (nat.w * zoom) / 2;
    const imgTop = CONTAINER_H / 2 + offset.y - (nat.h * zoom) / 2;
    const cropLeft = containerW / 2 - CROP_W / 2;
    const cropTop = CONTAINER_H / 2 - CROP_H / 2;

    const srcX = (cropLeft - imgLeft) / zoom;
    const srcY = (cropTop - imgTop) / zoom;
    const srcW = CROP_W / zoom;
    const srcH = CROP_H / zoom;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H);

    canvas.toBlob((blob) => {
      if (!blob) { setConfirming(false); return; }
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
      onConfirm(file, URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  }

  const iw = nat.w * zoom;
  const ih = nat.h * zoom;
  const imgLeft = containerW / 2 + offset.x - iw / 2;
  const imgTop = CONTAINER_H / 2 + offset.y - ih / 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[480px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-800">เลือกพื้นที่รูปปก</p>
            <p className="text-xs text-gray-400 mt-0.5">ลากรูปเพื่อปรับตำแหน่ง · scroll เพื่อซูม</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          className="relative bg-gray-900 select-none overflow-hidden cursor-grab active:cursor-grabbing touch-none"
          style={{ height: CONTAINER_H }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* Hidden img used for canvas drawImage — keeps naturalWidth/Height */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            className="hidden"
            onLoad={handleImgLoad}
            draggable={false}
          />

          {/* Visible draggable image */}
          {nat.w > 0 && (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                width: iw,
                height: ih,
                left: imgLeft,
                top: imgTop,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )}

          {/* Dark overlay (outline trick) + white border + corner L-marks */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: CROP_W,
              height: CROP_H,
              outline: "9999px solid rgba(0,0,0,0.62)",
              border: "1.5px solid rgba(255,255,255,0.7)",
              zIndex: 10,
            }}
          >
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -translate-x-px -translate-y-px" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white translate-x-px -translate-y-px" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -translate-x-px translate-y-px" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white translate-x-px translate-y-px" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">ผลลัพธ์ {OUT_W} × {OUT_H} px</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={nat.w === 0 || confirming}
              className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {confirming ? "กำลังครอป..." : "ใช้รูปนี้"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
