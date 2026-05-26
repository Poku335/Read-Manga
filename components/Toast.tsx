"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      ctx.addToast(message, variant);
    },
    [ctx]
  );

  return { toast };
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "bg-green-500/15 border-green-500/30 text-green-400",
  error:   "bg-red-500/15 border-red-500/30 text-red-400",
  info:    "bg-blue-500/15 border-blue-500/30 text-blue-400",
};

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: "✓",
  error:   "✕",
  info:    "i",
};

interface ToastCardProps {
  item: ToastItem;
  onRemove: (id: number) => void;
}

function ToastCard({ item, onRemove }: ToastCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const slideOut = setTimeout(() => setVisible(false), 3000);
    const unmount  = setTimeout(() => onRemove(item.id), 3350);
    return () => {
      clearTimeout(slideOut);
      clearTimeout(unmount);
    };
  }, [item.id, onRemove]);

  function dismiss() {
    setVisible(false);
    setTimeout(() => onRemove(item.id), 350);
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        "flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl",
        "min-w-[260px] max-w-[360px]",
        "transition-all duration-300 ease-in-out",
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        VARIANT_STYLES[item.variant],
      ].join(" ")}
    >
      <span className="flex-shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-bold mt-0.5">
        {VARIANT_ICON[item.variant]}
      </span>

      <p className="text-sm font-medium leading-snug flex-1">{item.message}</p>

      <button
        onClick={dismiss}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-current"
        aria-label="ปิด"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

let _nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
