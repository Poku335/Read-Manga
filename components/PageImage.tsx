"use client";

import { useState } from "react";
import Image from "next/image";

function toBase64(str: string): string {
  if (typeof window === "undefined") return Buffer.from(str).toString("base64");
  return window.btoa(str);
}

const BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(
  '<svg xmlns="http://www.w3.org/2000/svg" width="9" height="13"><rect width="9" height="13" fill="#1c1c20"/></svg>'
)}`;

interface PageImageProps {
  src: string;
  pageNumber: number;
  priority: boolean;
}

export default function PageImage({ src, pageNumber, priority }: PageImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [retries, setRetries] = useState(0);
  const [failed, setFailed] = useState(false);

  function handleError() {
    if (retries < 2) {
      const next = retries + 1;
      setRetries(next);
      setImgSrc(`${src}?retry=${next}`);
    } else {
      setFailed(true);
    }
  }

  function handleRetry() {
    setRetries(0);
    setImgSrc(src);
    setFailed(false);
  }

  if (failed) {
    return (
      <div
        className="w-full bg-surface border border-border flex flex-col items-center justify-center gap-3 py-16"
        style={{ aspectRatio: "900/1300" }}
      >
        <p className="text-sm text-muted">โหลดรูปหน้า {pageNumber} ไม่สำเร็จ</p>
        <button
          onClick={handleRetry}
          className="text-xs font-bold text-accent hover:underline"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={`หน้า ${pageNumber}`}
      width={900}
      height={1300}
      className="block h-auto w-full bg-black"
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      sizes="(max-width: 768px) 100vw, 900px"
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      onError={handleError}
    />
  );
}
