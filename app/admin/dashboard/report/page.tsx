"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface SessionUser { role?: string }

interface Issue {
  id: string;
  severity: "critical" | "major" | "minor";
  title: string;
  file?: string;
  line?: number;
  description: string;
  suggestedFix?: string;
}

interface ReportSummary {
  critical: number;
  major: number;
  minor: number;
  totalIssues: number;
}

interface SiteReport {
  id: number;
  createdAt: string;
  generatedBy: string;
  summary: ReportSummary;
  frontendIssues: Issue[];
  backendIssues: Issue[];
  status: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  major: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  minor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
};

const DEMO_REPORT: Omit<SiteReport, "id" | "createdAt" | "status"> = {
  generatedBy: "AI Agent System (Frontend + Tester)",
  summary: { critical: 15, major: 22, minor: 25, totalIssues: 62 },
  frontendIssues: [
    {
      id: "f1", severity: "critical", title: "CommentSection ไม่มี JSX return",
      file: "components/CommentSection.tsx", line: 85,
      description: "Component จบที่ handleDelete โดยไม่มี return statement ทำให้ comments section ไม่แสดงผลเลย",
      suggestedFix: "เพิ่ม return JSX ที่แสดง comments list, star rating และ comment input form",
    },
    {
      id: "f2", severity: "critical", title: "CSS Animation 'swiper-progress' ไม่ถูก define",
      file: "components/HeroSwapper.tsx", line: 71,
      description: "Component ใช้ animation 'swiper-progress' แต่ไม่มีการ define keyframes ใน globals.css",
      suggestedFix: "เพิ่ม @keyframes swiper-progress { from { width: 100%; } to { width: 0; } } ใน globals.css",
    },
    {
      id: "f4", severity: "critical", title: "TopUp Page ขาด 'use client'",
      file: "app/topup/page.tsx", line: 1,
      description: "Page ใช้ useSession() และ useState แต่ไม่มี 'use client' directive",
      suggestedFix: "เพิ่ม \"use client\" ที่บรรทัดแรกของไฟล์",
    },
    {
      id: "f5", severity: "critical", title: "Refer Page ปุ่ม Copy ถูก disabled",
      file: "app/refer/page.tsx", line: 39,
      description: "ปุ่ม copy มี disabled attribute และแสดง URL placeholder แทน URL จริง ทำให้ feature ใช้ไม่ได้เลย",
      suggestedFix: "Generate referral URL จาก user ID, implement clipboard API, remove disabled attribute",
    },
    {
      id: "f6", severity: "major", title: "ไม่มี loading.tsx สำหรับหลายหน้า",
      description: "หน้า bookmarks, reading-history, settings, refer, topup ไม่มี loading skeleton",
      suggestedFix: "สร้าง loading.tsx ใน app/bookmarks/, app/reading-history/, app/settings/, app/refer/, app/topup/",
    },
    {
      id: "f8", severity: "major", title: "ไม่มี Error UI เมื่อ API ล้มเหลว",
      file: "app/admin/dashboard/page.tsx",
      description: "Loading spinner แสดงค้างไว้หาก API error เพราะไม่มี error state",
      suggestedFix: "เพิ่ม error state และแสดง error message UI",
    },
    {
      id: "f9", severity: "major", title: "Skeleton class ไม่ถูก define",
      file: "app/loading.tsx",
      description: ".skeleton class ถูกใช้แต่ไม่ได้ define ใน globals.css ทำให้ loading screen ไม่มี animation",
      suggestedFix: "เพิ่ม .skeleton { @apply bg-border/30 animate-pulse; } ใน globals.css",
    },
    {
      id: "f10", severity: "minor", title: "หลายหน้าขาด metadata export",
      description: "topup, bookmarks, settings, refer, reading-history, bookshelf ไม่มี metadata → ชื่อ tab เบราว์เซอร์ว่าง",
      suggestedFix: "เพิ่ม export const metadata = { title: '...' } ในแต่ละ page",
    },
    {
      id: "f11", severity: "minor", title: "Hardcoded Demo Credentials ใน SignIn Form",
      file: "app/auth/signin/SignInForm.tsx", line: 11,
      description: "Pre-filled email admin@manga.com และแสดง credentials ใน UI — security risk ใน production",
      suggestedFix: "Remove credentials display หรือแสดงเฉพาะใน NODE_ENV === 'development'",
    },
    {
      id: "f12", severity: "minor", title: "Hardcoded English text ใน Thai app",
      file: "app/manga/new/page.tsx", line: 48,
      description: "Text อย่าง 'Add New Manga', 'Cover Image', 'Creating...' ยังเป็นภาษาอังกฤษ",
      suggestedFix: "แปลเป็นภาษาไทย",
    },
    {
      id: "f13", severity: "minor", title: "Accessibility: dropdown ไม่รองรับ keyboard",
      file: "components/Navbar.tsx",
      description: "Dropdown menus ไม่มี role='menu', aria attributes หรือ keyboard navigation",
      suggestedFix: "เพิ่ม onKeyDown handlers สำหรับ arrow keys, Enter, Escape",
    },
  ],
  backendIssues: [
    {
      id: "b1", severity: "critical", title: "POST /api/chapter ไม่มี Authentication",
      file: "app/api/chapter/route.ts", line: 4,
      description: "ใครก็ได้สามารถสร้าง chapter ให้ manga ใดก็ได้โดยไม่ต้องล็อกอิน ไม่มีการตรวจสอบว่า user เป็นเจ้าของ manga",
      suggestedFix: "เพิ่ม auth() check + ตรวจสอบว่า authorId ตรงกับ session user",
    },
    {
      id: "b2", severity: "critical", title: "POST /api/page ไม่มี Authentication",
      file: "app/api/page/route.ts", line: 6,
      description: "ใครก็ได้อัปโหลดรูปภาพให้ chapter ใดก็ได้ ไม่มีการตรวจสอบ owner",
      suggestedFix: "เพิ่ม auth() + ตรวจสอบ chapter.manga.authorId === session user id",
    },
    {
      id: "b3", severity: "critical", title: "ไม่มีการ validate file type ใน upload endpoints",
      file: "app/api/page/route.ts", line: 23,
      description: "รับไฟล์ทุกประเภทโดยไม่ตรวจสอบ MIME type — อาจ upload .exe, .sh, .php ได้ ทำให้เสี่ยง RCE",
      suggestedFix: "ตรวจ file.type ให้อยู่ใน ['image/jpeg','image/png','image/webp'] และ validate extension",
    },
    {
      id: "b4", severity: "critical", title: "ไม่มีการ validate file size ใน upload endpoints",
      file: "app/api/page/route.ts",
      description: "ไม่มีการจำกัดขนาดไฟล์ต่อไฟล์ ทำให้ disk exhaustion ได้",
      suggestedFix: "เพิ่ม if (file.size > 10 * 1024 * 1024) return 413",
    },
    {
      id: "b5", severity: "critical", title: "Race Condition ในระบบซื้อเหรียญ (TOCTOU)",
      file: "app/api/purchase/route.ts", line: 47,
      description: "ตรวจ coins ก่อน แต่ไม่ได้ใช้ atomic transaction — user สามารถใช้เหรียญซื้อหลาย chapter พร้อมกันได้ด้วย concurrent requests",
      suggestedFix: "ใช้ prisma.user.updateMany({ where: { id, coins: { gte: price } } }) แล้วตรวจ updated.count === 0",
    },
    {
      id: "b6", severity: "critical", title: "POST /api/manga ไม่ enforce Authentication",
      file: "app/api/manga/route.ts", line: 22,
      description: "ดึง session แต่ไม่ return 401 ถ้าไม่มี session — guest สามารถสร้าง manga ได้",
      suggestedFix: "if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })",
    },
    {
      id: "b7", severity: "critical", title: "ไม่มี Security Headers ใน next.config.ts",
      file: "next.config.ts",
      description: "ขาด X-Frame-Options, X-Content-Type-Options, CSP, HSTS ทั้งหมด — เสี่ยง clickjacking, XSS",
      suggestedFix: "เพิ่ม headers() ใน next.config.ts พร้อม X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security",
    },
    {
      id: "b8", severity: "critical", title: "ไม่มี Rate Limiting บน auth/purchase endpoints",
      file: "app/api/auth/signup/route.ts",
      description: "Signup, topup, purchase ไม่มี rate limiting — เสี่ยง brute force, DoS, spam accounts",
      suggestedFix: "ใช้ @upstash/ratelimit หรือ next-rate-limit ก่อน handler",
    },
    {
      id: "b9", severity: "critical", title: "Admin สามารถ set coins เป็น negative ได้",
      file: "app/api/admin/users/update-coins/route.ts",
      description: "ไม่มี validation บน amount — ใส่ค่า double negative ได้ทำให้ coins เพิ่มแทนลด",
      suggestedFix: "ตรวจสอบ Number.isInteger(amount) และ จำกัด range เช่น -999999 ถึง 999999",
    },
    {
      id: "b10", severity: "critical", title: "Manga.author ไม่มี onDelete: Cascade",
      file: "prisma/schema.prisma", line: 69,
      description: "เมื่อลบ User ที่เป็น author, manga จะกลายเป็น orphaned records — authorId เป็น NULL",
      suggestedFix: "เพิ่ม onDelete: Cascade ใน author relation ของ Manga model",
    },
    {
      id: "b11", severity: "major", title: "ไม่มี Pagination บน admin list endpoints",
      file: "app/api/admin/users/route.ts", line: 20,
      description: "ดึง users/chapters/purchases ทั้งหมดโดยไม่มี pagination — อาจ OOM ใน production",
      suggestedFix: "เพิ่ม skip/take pagination parameter พร้อม total count",
    },
    {
      id: "b12", severity: "major", title: "ไม่มี Database Indexes บน fields ที่ query บ่อย",
      file: "prisma/schema.prisma",
      description: "Bookmark.userId, Purchase.userId, ReadingHistory.userId, Comment.mangaId ขาด index ทำให้ query ช้า",
      suggestedFix: "เพิ่ม @@index([userId]) และ @@index([mangaId]) ใน models ที่เกี่ยวข้อง",
    },
    {
      id: "b13", severity: "major", title: "ไม่มี Validation บน POST /api/ratings",
      file: "app/api/ratings/route.ts", line: 33,
      description: "score ไม่ถูก validate ว่าเป็น integer — ค่า 2.5, NaN ผ่านได้",
      suggestedFix: "ตรวจ Number.isInteger(score) && score >= 1 && score <= 5",
    },
    {
      id: "b14", severity: "major", title: "User role เป็น String ไม่ใช่ Enum",
      file: "prisma/schema.prisma", line: 16,
      description: "role field ไม่มี constraint — database ยอมรับ 'HACKER', 'SUPERADMIN' ฯลฯ",
      suggestedFix: "สร้าง enum UserRole { USER ADMIN } และใช้แทน String",
    },
    {
      id: "b15", severity: "major", title: "ไม่มี Pagination บน GET /api/comments",
      file: "app/api/comments/route.ts",
      description: "hard limit 50 comments แต่ไม่มี pagination — manga ยอดนิยมจะโหลดช้า",
      suggestedFix: "เพิ่ม page/limit params และ return { comments, total, page }",
    },
    {
      id: "b16", severity: "minor", title: "Inconsistent Error Response Format",
      description: "บาง endpoint return { error } บาง return { success: false } ไม่สม่ำเสมอ",
      suggestedFix: "กำหนด standard format: { success: true/false, data?, error? }",
    },
    {
      id: "b17", severity: "minor", title: "Unsafe Type Casts ใน API Routes",
      file: "app/api/page/route.ts", line: 10,
      description: "ใช้ as string, as File cast โดยไม่ตรวจสอบ — อาจ runtime error ถ้า field ขาด",
      suggestedFix: "สร้าง type-safe helper สำหรับดึงค่าจาก FormData",
    },
    {
      id: "b18", severity: "minor", title: "Coins ถูกเก็บใน JWT Token",
      file: "lib/auth.config.ts", line: 44,
      description: "coin balance อยู่ใน JWT ที่ frontend อ่านได้ — ถ้า token ถูก steal จะเห็น balance",
      suggestedFix: "ไม่ include coins ใน JWT แล้ว fetch แยกผ่าน API แทน",
    },
  ],
};

function exportToExcel(report: SiteReport) {
  const escape = (s?: string | number) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const severityColor: Record<string, string> = {
    critical: "#fca5a5",
    major: "#fde68a",
    minor: "#93c5fd",
  };

  const issueRows = (issues: Issue[], label: string) =>
    issues
      .map(
        (i) =>
          `<tr>
            <td>${escape(label)}</td>
            <td style="background:${severityColor[i.severity]}">${escape(i.severity.toUpperCase())}</td>
            <td>${escape(i.title)}</td>
            <td style="font-family:monospace">${escape(i.file)}${i.line ? `:${i.line}` : ""}</td>
            <td>${escape(i.description)}</td>
            <td>${escape(i.suggestedFix)}</td>
          </tr>`
      )
      .join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"/></head>
    <body>
      <table border="1">
        <tr><td colspan="6" style="font-size:16px;font-weight:bold;background:#1e293b;color:#fff">
          Site Health Report — ${new Date(report.createdAt).toLocaleString("th-TH")}
        </td></tr>
        <tr><td colspan="6" style="background:#334155;color:#cbd5e1">สร้างโดย: ${escape(report.generatedBy)}</td></tr>
        <tr></tr>
        <tr>
          <td style="font-weight:bold;background:#475569;color:#fff">ปัญหาทั้งหมด</td>
          <td style="font-weight:bold;background:#475569;color:#fff">Critical</td>
          <td style="font-weight:bold;background:#475569;color:#fff">Major</td>
          <td style="font-weight:bold;background:#475569;color:#fff">Minor</td>
          <td></td><td></td>
        </tr>
        <tr>
          <td>${report.summary.totalIssues}</td>
          <td style="background:#fca5a5">${report.summary.critical}</td>
          <td style="background:#fde68a">${report.summary.major}</td>
          <td style="background:#93c5fd">${report.summary.minor}</td>
          <td></td><td></td>
        </tr>
        <tr></tr>
        <tr>
          <th style="background:#1e293b;color:#fff">Layer</th>
          <th style="background:#1e293b;color:#fff">Severity</th>
          <th style="background:#1e293b;color:#fff">Issue</th>
          <th style="background:#1e293b;color:#fff">File</th>
          <th style="background:#1e293b;color:#fff">Description</th>
          <th style="background:#1e293b;color:#fff">Suggested Fix</th>
        </tr>
        ${issueRows(report.frontendIssues as Issue[], "Frontend")}
        ${issueRows(report.backendIssues as Issue[], "Backend")}
      </table>
    </body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `site-report-${new Date(report.createdAt).toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [report, setReport] = useState<SiteReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"frontend" | "backend">("frontend");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const user = session?.user as (NonNullable<typeof session>["user"] & SessionUser) | undefined;
  const isAdmin = status === "authenticated" && user?.role === "ADMIN";

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/report", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) fetchReport(); }, [isAdmin, fetchReport]);

  if (status === "loading") return <div className="text-center py-12 text-muted">Loading...</div>;
  if (status === "unauthenticated") { router.push("/auth/signin"); return null; }
  if (!isAdmin) return <div className="text-center py-12 text-red-500">Access denied. Admin only.</div>;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEMO_REPORT),
      });
      if (res.ok) await fetchReport();
      else alert("Generate report failed");
    } catch (err) {
      console.error(err);
      alert("Error generating report");
    } finally {
      setGenerating(false);
    }
  }

  const issues = activeTab === "frontend"
    ? (report?.frontendIssues ?? []) as Issue[]
    : (report?.backendIssues ?? []) as Issue[];

  const countBySeverity = (list: Issue[], sev: string) =>
    list.filter((i) => i.severity === sev).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Site Health Report</h1>
          <p className="text-muted text-sm mt-0.5">
            {report
              ? `รายงานล่าสุด: ${new Date(report.createdAt).toLocaleString("th-TH")} · สร้างโดย ${report.generatedBy}`
              : "ยังไม่มีรายงาน"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report && (
            <button
              onClick={() => exportToExcel(report)}
              className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8-3-3m3 3 3-3M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Export Excel
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลัง Generate...
              </>
            ) : (
              "Generate New Report"
            )}
          </button>
          <Link
            href="/admin/dashboard"
            className="bg-bg border border-border text-muted text-sm px-4 py-2 rounded-lg hover:text-text transition-colors"
          >
            ← กลับ Dashboard
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted py-16">
          <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">กำลังโหลด...</p>
        </div>
      )}

      {!loading && !report && (
        <div className="text-center py-20 bg-surface border border-border rounded-2xl">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-text font-semibold mb-1">ยังไม่มีรายงาน</p>
          <p className="text-muted text-sm mb-6">กด "Generate New Report" เพื่อสร้างรายงานจาก AI Agents</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-accent text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {generating ? "กำลัง Generate..." : "Generate New Report"}
          </button>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "ปัญหาทั้งหมด", value: report.summary.totalIssues, color: "text-text" },
              { label: "Critical", value: report.summary.critical, color: "text-red-400" },
              { label: "Major", value: report.summary.major, color: "text-yellow-400" },
              { label: "Minor", value: report.summary.minor, color: "text-blue-400" },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-bg border border-border rounded-xl p-1 w-fit">
            {(["frontend", "backend"] as const).map((t) => {
              const list = (t === "frontend" ? report.frontendIssues : report.backendIssues) as Issue[];
              const critCount = countBySeverity(list, "critical");
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex items-center gap-1.5 px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
                    activeTab === t ? "bg-surface text-accent shadow-sm border border-border" : "text-muted hover:text-text"
                  }`}
                >
                  {t === "frontend" ? "Frontend" : "Backend"}
                  <span className="text-xs bg-muted/20 px-1.5 py-0.5 rounded-full">{list.length}</span>
                  {critCount > 0 && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{critCount} crit</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Issues list */}
          {issues.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-border rounded-2xl">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-text font-semibold">ไม่พบปัญหาใน {activeTab} layer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                    className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-bg/50 transition-colors"
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 mt-0.5 ${SEVERITY_STYLE[issue.severity]}`}>
                      {SEVERITY_LABEL[issue.severity]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text text-sm font-semibold">{issue.title}</p>
                      {issue.file && (
                        <p className="text-muted text-xs mt-0.5 font-mono">
                          {issue.file}{issue.line ? `:${issue.line}` : ""}
                        </p>
                      )}
                    </div>
                    <svg
                      width="16" height="16"
                      className={`text-muted flex-shrink-0 mt-0.5 transition-transform ${expandedId === issue.id ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedId === issue.id && (
                    <div className="px-4 pb-4 border-t border-border">
                      <p className="text-muted text-sm mt-3 leading-relaxed">{issue.description}</p>
                      {issue.suggestedFix && (
                        <div className="mt-3 bg-bg border border-border rounded-lg p-3">
                          <p className="text-xs font-semibold text-accent mb-1">แนะนำการแก้ไข</p>
                          <p className="text-muted text-xs leading-relaxed">{issue.suggestedFix}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
