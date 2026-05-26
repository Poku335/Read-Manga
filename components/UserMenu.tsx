"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  coins?: number;
  role?: string;
}

const IconWallet = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);
const IconHistory = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6v6l4 2M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0Z" />
  </svg>
);
const IconReceipt = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4" />
  </svg>
);
const IconBookmark = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5Z" />
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
const IconShield = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);
const IconCoin = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M14.5 9.5a2.5 2.5 0 0 0-5 0c0 1.5 1 2 2.5 2.5S15 13 15 14.5a2.5 2.5 0 0 1-5 0M12 7v1M12 16v1" />
  </svg>
);

const MENU_ITEMS: { href: string; Icon: () => ReactNode; label: string }[] = [
  { href: "/wallet", Icon: IconWallet, label: "Wallet" },
  { href: "/reading-history", Icon: IconHistory, label: "ประวัติการอ่าน" },
  { href: "/purchase-history", Icon: IconReceipt, label: "ประวัติการซื้อ" },
  { href: "/bookmarks", Icon: IconBookmark, label: "บุ๊กมาร์ก" },
  { href: "/settings", Icon: IconSettings, label: "การตั้งค่า" },
];

export default function UserMenu({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const emailPrefix = user?.email?.split("@")[0] || "";

  return (
    <div className="absolute top-full right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl z-50 w-64 overflow-hidden">
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent/30 flex-shrink-0">
            {user?.image ? (
              <img src={user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text truncate">{user?.name}</p>
            <p className="text-xs text-muted truncate">@{emailPrefix}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gold">
            <IconCoin />
            <span className="font-bold text-sm">{user?.coins ?? 0}</span>
          </div>
          <Link
            href="/topup"
            onClick={onClose}
            className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-accent-hover transition-colors"
          >
            เติมเหรียญ
          </Link>
        </div>
      </div>

      <div className="py-1">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text/70 hover:bg-card hover:text-text transition-colors"
          >
            <span className="w-4 flex items-center justify-center text-text/40">
              <item.Icon />
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
        {user?.role === "ADMIN" && (
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text/70 hover:bg-card hover:text-text transition-colors"
          >
            <span className="w-4 flex items-center justify-center text-text/40">
              <IconShield />
            </span>
            <span>แอดมิน Dashboard</span>
          </Link>
        )}
        <div className="border-t border-border mt-1 pt-1">
          <button
            onClick={() => { signOut({ callbackUrl: "/" }); onClose(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <span className="w-4 flex items-center justify-center">
              <IconLogout />
            </span>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
