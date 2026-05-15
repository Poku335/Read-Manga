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
  const cropFrameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  // Refs hold latest values so non-reactive native handlers can read them correctly
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const natRef = useRef({ w: 0, h: 0 });
  const minZoomRef = useRef(1);

  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [confirming, setConfirming] = useState(false);

  // Sync refs with latest state on every render (safe — synchronous in render body)
  zoomRef.current = zoom;
  offsetRef.current = offset;
  natRef.current = nat;

  // Non-passive wheel listener — React's onWheel is passive by default and
  // cannot call preventDefault(), causing the page to scroll while zooming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (natRef.current.w === 0) return;
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const newZoom = parseFloat(
        Math.max(minZoomRef.current, Math.min(4, zoomRef.current + delta)).toFixed(2)
      );
      const clamped = clampOffset(offsetRef.current.x, offsetRef.current.y, newZoom, natRef.current.w, natRef.current.h);
      setZoom(newZoom);
      setOffset(clamped);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function handleImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const natural = { w: img.naturalWidth, h: img.naturalHeight };
    const initZoom = parseFloat(Math.max(CROP_W / natural.w, CROP_H / natural.h).toFixed(4));
    minZoomRef.current = initZoom;
    natRef.current = natural;
    setNat(natural);
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

  function handleZoomSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const newZoom = parseFloat((parseInt(e.target.value) / 100).toFixed(2));
    setZoom(newZoom);
    setOffset(clampOffset(offset.x, offset.y, newZoom, nat.w, nat.h));
  }

  function handleConfirm() {
    const img = imgRef.current;
    const cropEl = cropFrameRef.current;
    if (!img || !cropEl || nat.w === 0) return;
    setConfirming(true);

    // Read actual rendered positions from the DOM — immune to any state/ref drift
    const imgRect = img.getBoundingClientRect();
    const cropRect = cropEl.getBoundingClientRect();

    // How many screen pixels from image top-left to crop frame top-left
    const dxLeft = cropRect.left - imgRect.left;
    const dyTop = cropRect.top - imgRect.top;

    // Scale factor: screen pixels → natural image pixels
    const scaleX = nat.w / imgRect.width;
    const scaleY = nat.h / imgRect.height;

    const srcX = dxLeft * scaleX;
    const srcY = dyTop * scaleY;
    const srcW = cropRect.width * scaleX;
    const srcH = cropRect.height * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    canvas.getContext("2d")!.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H);

    canvas.toBlob((blob) => {
      if (!blob) { setConfirming(false); return; }
      onConfirm(new File([blob], "cover.jpg", { type: "image/jpeg" }), URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  }

  const iw = nat.w * zoom;
  const ih = nat.h * zoom;
  const imgLeft = (containerRef.current?.offsetWidth ?? 380) / 2 + offset.x - iw / 2;
  const imgTop = CONTAINER_H / 2 + offset.y - ih / 2;
  const loaded = nat.w > 0;

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
            <p className="text-xs text-gray-400 mt-0.5">ลากรูปเพื่อปรับตำแหน่ง · scroll หรือ slider เพื่อซูม</p>
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
        >
          {/* Image: single element used for display AND canvas source via ref */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={handleImgLoad}
            style={{
              position: "absolute",
              width: iw || 0,
              height: ih || 0,
              left: imgLeft,
              top: imgTop,
              opacity: loaded ? 1 : 0,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />

          {/* Loading indicator */}
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Dark overlay with crop window hole (outline trick) + corner L-marks */}
          {loaded && (
            <div
              ref={cropFrameRef}
              className="pointer-events-none absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: CROP_W,
                height: CROP_H,
                outline: "9999px solid rgba(0,0,0,0.65)",
                border: "1.5px solid rgba(255,255,255,0.65)",
                zIndex: 10,
              }}
            >
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white -translate-x-px -translate-y-px" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white translate-x-px -translate-y-px" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white -translate-x-px translate-y-px" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white translate-x-px translate-y-px" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-gray-100">
          {/* Zoom slider — fallback for touchpad / mobile where scroll wheel is unreliable */}
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
            </svg>
            <input
              type="range"
              min={Math.round((nat.w > 0 ? Math.max(CROP_W / nat.w, CROP_H / nat.h) : 0.1) * 100)}
              max={400}
              value={Math.round(zoom * 100)}
              onChange={handleZoomSlider}
              disabled={!loaded}
              className="flex-1 h-1.5 accent-purple-600 disabled:opacity-30 cursor-pointer"
            />
          </div>

          <div className="flex gap-2 flex-shrink-0">
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
              disabled={!loaded || confirming}
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
