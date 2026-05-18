import type { Metadata } from "next";
import { Suspense } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import MainWrapper from "@/components/MainWrapper";
import AuthProvider from "@/app/providers";
import BackToTop from "@/components/BackToTop";
import { ToastProvider } from "@/components/Toast";
import { prisma } from "@/lib/prisma";

function darken(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * 0.82)
    .toString(16)
    .padStart(2, "0")}${Math.round(g * 0.82)
    .toString(16)
    .padStart(2, "0")}${Math.round(b * 0.82)
    .toString(16)
    .padStart(2, "0")}`;
}

function deriveBgPalette(bgHex: string) {
  const clamp = (v: number) => Math.min(255, Math.max(0, v));
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  const hex = (v: number) => v.toString(16).padStart(2, "0");
  const mk = (dr: number, dg: number, db: number) =>
    `#${hex(clamp(r + dr))}${hex(clamp(g + dg))}${hex(clamp(b + db))}`;
  return {
    surface: mk(8, 8, 10),
    card: mk(15, 15, 18),
    border: mk(28, 28, 32),
  };
}

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MangBoh", template: "%s | MangBoh" },
  description: "อ่านมังงะ การ์ตูน ออนไลน์ฟรี อัปเดตทุกวัน",
  keywords: ["มังงะ", "การ์ตูน", "อ่านออนไลน์", "manga", "webtoon"],
  openGraph: {
    siteName: "MangBoh",
    type: "website",
    locale: "th_TH",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let accent = "#5E6AD2";
  let bg = "#313338";
  try {
    const [accentRow, bgRow] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { key: "accentColor" } }),
      prisma.siteConfig.findUnique({ where: { key: "bgColor" } }),
    ]);
    if (accentRow?.value && /^#[0-9a-fA-F]{6}$/.test(accentRow.value))
      accent = accentRow.value;
    if (bgRow?.value && /^#[0-9a-fA-F]{6}$/.test(bgRow.value)) bg = bgRow.value;
  } catch {}
  const accentHover = darken(accent);
  const bgPalette = deriveBgPalette(bg);

  return (
    <html lang="th" className={poppins.variable}>
      <head>
        <style>{`:root{--accent:${accent};--accent-hover:${accentHover};--bg:${bg};--surface:${bgPalette.surface};--card:${bgPalette.card};--border:${bgPalette.border};}`}</style>
      </head>
      <body className="min-h-screen bg-bg text-text font-[family-name:var(--font-poppins)]">
        <AuthProvider>
          <ToastProvider>
            <Suspense
              fallback={
                <div className="h-16 bg-surface/95 border-b border-border" />
              }
            >
              <NavbarWrapper />
            </Suspense>
            <MainWrapper>{children}</MainWrapper>
            <BackToTop />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
