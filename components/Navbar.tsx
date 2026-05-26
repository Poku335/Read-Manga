"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import UserMenu from "./UserMenu";

interface SessionUser {
  coins?: number;
  role?: string;
}

const CATEGORY_LINKS = [
  { href: "/", label: "ทั้งหมด" },
  { href: "/?type=comics", label: "การ์ตูน" },
  { href: "/?genre=Action", label: "Action" },
  { href: "/?genre=Fantasy", label: "Fantasy" },
  { href: "/?genre=Romance", label: "Romance" },
  { href: "/?genre=Sci-Fi", label: "Sci-Fi" },
  { href: "/?genre=Comedy", label: "Comedy" },
  { href: "/?genre=Horror", label: "Horror" },
  { href: "/?genre=Drama", label: "Drama" },
  { href: "/?genre=Slice%20of%20Life", label: "Slice of Life" },
  { href: "/?genre=Adventure", label: "Adventure" },
  { href: "/?genre=Mystery", label: "Mystery" },
  { href: "/?genre=Thriller", label: "Thriller" },
  { href: "/?genre=Historical", label: "Historical" },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const user = session?.user as
    | (NonNullable<typeof session>["user"] & SessionUser)
    | undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
    setMenuOpen(false);
    setCategoryOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
      if (
        categoryOpen &&
        categoryRef.current &&
        !categoryRef.current.contains(event.target as Node)
      ) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, categoryOpen]);

  function isLinkActive(href: string): boolean {
    const [hrefPath, hrefQuery] = href.split("?");
    if (pathname !== hrefPath) return false;
    if (!hrefQuery) {
      // "/" with no query params — active only when no relevant search params set
      return !searchParams.get("type") && !searchParams.get("genre");
    }
    const hrefParams = new URLSearchParams(hrefQuery);
    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }

  return (
    <nav className="bg-surface/95 backdrop-blur-md border-b border-border sticky top-0 z-50 relative">
      {searchOpen && (
        <div className="absolute inset-0 bg-surface backdrop-blur flex items-center px-4 z-10">
          <form
            onSubmit={handleSearchSubmit}
            className="flex gap-2 w-full max-w-2xl mx-auto"
          >
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setSearchQuery("");
                }
              }}
              placeholder="ค้นหามังงะ การ์ตูน..."
              className="flex-1 bg-bg border border-border rounded-full px-4 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-white/40 transition-colors"
            />
            <button
              type="submit"
              className="bg-accent text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-accent-hover transition-colors"
            >
              ค้นหา
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="text-muted hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="ปิดค้นหา"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </form>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
          <svg
            width="22"
            height="22"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent group-hover:scale-110 transition-transform duration-200"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span className="font-bold text-lg text-white tracking-wide">
            MangBoh
          </span>
        </Link>

        <div
          ref={categoryRef}
          className="hidden md:flex items-center gap-2 ml-8 relative"
        >
          <button
            type="button"
            onClick={() => setCategoryOpen((open) => !open)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setCategoryOpen(false);
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setCategoryOpen((open) => !open);
              }
            }}
            className="text-sm font-medium text-text/70 hover:text-white hover:bg-white/5 transition-all px-3 py-2 rounded-full flex items-center gap-2"
            aria-expanded={categoryOpen}
            aria-haspopup="true"
          >
            หมวดหมู่
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {categoryOpen && (
            <div
              className="absolute top-full left-0 mt-2 w-44 rounded-xl border border-border bg-surface shadow-2xl py-1 overflow-hidden"
              role="menu"
              onKeyDown={(e) => {
                if (e.key === "Escape") setCategoryOpen(false);
              }}
            >
              {CATEGORY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  className={`block px-4 py-2.5 text-sm transition-colors ${
                    isLinkActive(link.href)
                      ? "text-white bg-white/10 font-semibold"
                      : "text-text/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="text-text/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            aria-label="ค้นหา"
          >
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          {mounted && status === "authenticated" && (
            <Link
              href="/topup"
              className="hidden sm:flex items-center gap-1.5 bg-gold/10 border border-gold/20 text-gold text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gold/20 transition-colors ml-1"
            >
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M14.5 9.5a2.5 2.5 0 0 0-5 0c0 1.5 1 2 2.5 2.5S15 13 15 14.5a2.5 2.5 0 0 1-5 0M12 7v1M12 16v1" />
              </svg>
              {user?.coins ?? 0}
            </Link>
          )}

          {!mounted || status === "loading" ? (
            <div className="w-9 h-9 bg-border rounded-full animate-pulse ml-2" />
          ) : status === "unauthenticated" ? (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/auth/signin"
                className="text-sm text-text/70 hover:text-white transition-colors hidden sm:block"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm bg-accent text-white font-semibold px-4 py-1.5 rounded-full hover:bg-accent-hover transition-colors"
              >
                สมัครสมาชิก
              </Link>
            </div>
          ) : (
            <div ref={menuRef} className="relative ml-2">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-accent/40 hover:border-accent transition-colors flex-shrink-0 flex items-center justify-center"
                aria-label="เมนูผู้ใช้"
                aria-expanded={menuOpen}
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z" />
                    </svg>
                  </div>
                )}
              </button>
              {menuOpen && <UserMenu onClose={() => setMenuOpen(false)} />}
            </div>
          )}

          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden text-text/60 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors ml-1"
            aria-label={mobileNavOpen ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? (
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="md:hidden border-t border-border bg-surface/98 px-4 py-3 space-y-1">
          <div className="px-3 py-2 text-xs uppercase tracking-[0.25em] text-muted">
            หมวดหมู่
          </div>
          {CATEGORY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isLinkActive(link.href)
                  ? "text-white bg-white/10 font-semibold"
                  : "text-text/80 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {status === "authenticated" && (
            <>
              <div className="border-t border-border my-2" />
              <Link
                href="/topup"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text/80 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gold"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M14.5 9.5a2.5 2.5 0 0 0-5 0c0 1.5 1 2 2.5 2.5S15 13 15 14.5a2.5 2.5 0 0 1-5 0M12 7v1M12 16v1" />
                </svg>
                <span>เติมเหรียญ</span>
                <span className="ml-auto text-gold font-bold text-xs">
                  {user?.coins ?? 0}
                </span>
              </Link>
            </>
          )}
          {status === "unauthenticated" && (
            <>
              <div className="border-t border-border my-2" />
              <Link
                href="/auth/signin"
                className="block px-3 py-2.5 rounded-lg text-sm text-text/80 hover:text-white hover:bg-white/5 transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/auth/signup"
                className="block px-3 py-2.5 rounded-lg text-sm bg-accent/10 text-accent font-medium hover:bg-accent/20 transition-colors"
              >
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
