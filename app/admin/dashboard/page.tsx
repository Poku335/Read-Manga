"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/lib/useToast";
import Link from "next/link";
import Image from "next/image";

interface SessionUser { role?: string }

interface AdminUser {
  id: number; email: string; name: string; role: string; coins: number; createdAt: string;
}
interface MangaData {
  id: number; title: string; description: string; status: string; genre: string; coverImage: string | null; viewCount: number;
  _count: { chapters: number };
  chapters?: { id: number; chapterNumber: number }[];
}
interface Purchase {
  id: number; paidAmount: number; createdAt: string;
  user?: { name: string; email: string };
  chapter?: { chapterNumber: number; manga?: { title: string } };
}
interface RevenueData { totalCoins: number; totalPurchases: number; purchases: Purchase[] }

type Tab = "manga" | "users" | "revenue";

const STATUS_LABEL: Record<string, string> = {
  Ongoing: "กำลังดำเนิน", Completed: "จบแล้ว", Hiatus: "หยุดชั่วคราว",
};
const STATUS_COLOR: Record<string, string> = {
  Ongoing: "text-green-400 bg-green-400/10 border-green-400/20",
  Completed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Hiatus: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

const MAIN_GENRES = [
  "Action", "Fantasy", "Romance", "Sci-Fi", "Comedy", "Horror",
  "Drama", "Slice of Life", "Adventure", "Mystery", "Thriller", "Historical",
];
const STATUS_OPTIONS = ["Ongoing", "Completed", "Hiatus"];

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("manga");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mangas, setMangas] = useState<MangaData[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [searchManga, setSearchManga] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchRevenue, setSearchRevenue] = useState("");
  const { toast } = useToast();

  const [updateRoleModal, setUpdateRoleModal] = useState<AdminUser | null>(null);
  const [coinsModal, setCoinsModal] = useState<AdminUser | null>(null);
  const [coinsAmount, setCoinsAmount] = useState("");
  const [editModal, setEditModal] = useState<MangaData | null>(null);
  const [editForm, setEditForm] = useState({ title: "", status: "", genre: "" });
  const [deleteModal, setDeleteModal] = useState<MangaData | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const user = session?.user as (NonNullable<typeof session>["user"] & SessionUser) | undefined;
  const isAdmin = status === "authenticated" && user?.role === "ADMIN";

  const loadAll = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [mangaRes, usersRes, revenueRes] = await Promise.all([
        fetch("/api/manga"),
        fetch("/api/admin/users"),
        fetch("/api/admin/revenue"),
      ]);
      const [mangaJson, usersJson, revenueJson] = await Promise.all([
        mangaRes.json(),
        usersRes.json(),
        revenueRes.json(),
      ]);
      setMangas(mangaJson as MangaData[]);
      const usersData = usersJson as { data?: AdminUser[] } | AdminUser[];
      setUsers(Array.isArray(usersData) ? usersData : (usersData.data ?? []));
      setRevenue(revenueJson as RevenueData);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin, loadAll]);

  if (status === "loading") return <div className="text-center py-12 text-muted">Loading...</div>;
  if (status === "unauthenticated") { router.push("/auth/signin"); return null; }
  if (!isAdmin) return <div className="text-center py-12 text-red-500">Access denied. Admin only.</div>;

  async function handleUpdateRole(userId: number, role: string) {
    const res = await fetch("/api/admin/users/update-role", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      setUpdateRoleModal(null);
      loadAll("users");
      toast("เปลี่ยน role สำเร็จ", "success");
    } else {
      toast("เกิดข้อผิดพลาด ไม่สามารถเปลี่ยน role ได้", "error");
    }
  }

  async function handleUpdateCoins() {
    if (!coinsModal) return;
    const amount = parseInt(coinsAmount);
    if (isNaN(amount)) return;
    const res = await fetch("/api/admin/users/update-coins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: coinsModal.id, amount }),
    });
    if (res.ok) {
      setCoinsModal(null);
      setCoinsAmount("");
      loadAll("users");
      toast("อัปเดต coins สำเร็จ", "success");
    } else {
      toast("เกิดข้อผิดพลาด ไม่สามารถอัปเดต coins ได้", "error");
    }
  }

  async function handleEditSave() {
    if (!editModal) return;
    setEditSaving(true);
    const res = await fetch(`/api/manga/${editModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editForm.title, status: editForm.status, genre: editForm.genre }),
    });
    if (res.ok) {
      setEditModal(null);
      loadAll("manga");
      toast("บันทึกการ์ตูนสำเร็จ", "success");
    } else {
      toast("บันทึกไม่สำเร็จ กรุณาลองใหม่", "error");
    }
    setEditSaving(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteModal) return;
    const res = await fetch(`/api/manga/${deleteModal.id}`, { method: "DELETE" });
    if (res.ok) {
      setMangas((prev) => prev.filter((m) => m.id !== deleteModal.id));
      setDeleteModal(null);
      toast("ลบมังงะสำเร็จ", "success");
    } else {
      toast("เกิดข้อผิดพลาด ไม่สามารถลบได้", "error");
    }
  }

  const filteredMangas = mangas.filter((m) =>
    m.title.toLowerCase().includes(searchManga.toLowerCase())
  );
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const totalMangaViews = mangas.reduce((s, m) => s + (m.viewCount ?? 0), 0);

  const filteredRevenuePurchases = (revenue?.purchases ?? []).filter((p) => {
    const q = searchRevenue.toLowerCase();
    return (
      p.user?.name?.toLowerCase().includes(q) ||
      p.user?.email?.toLowerCase().includes(q)
    );
  });

  const tabs = [
    { key: "manga" as Tab, label: "การ์ตูน", count: mangas.length },
    { key: "users" as Tab, label: "ผู้ใช้", count: users.length },
    { key: "revenue" as Tab, label: "รายได้" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Admin Dashboard</h1>
          <p className="text-muted text-sm mt-0.5">จัดการระบบทั้งหมด</p>
        </div>
        <Link href="/manga/new" className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors">
          + เพิ่มการ์ตูน
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-bg border border-border rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
              tab === t.key ? "bg-surface text-accent shadow-sm border border-border" : "text-muted hover:text-text"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="text-xs bg-muted/20 px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-muted py-12">
          <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">กำลังโหลด...</p>
        </div>
      )}

      {!loading && fetchError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 font-semibold mb-1">ไม่สามารถโหลดข้อมูลได้</p>
          <p className="text-red-400/70 text-sm mb-4">{fetchError}</p>
          <button
            onClick={() => loadAll(tab)}
            className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* MANGA TAB */}
      {!loading && tab === "manga" && (
        <div>
          {mangas.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: "การ์ตูนทั้งหมด",
                  value: mangas.length,
                  color: "text-accent",
                  iconBg: "bg-accent/20",
                  icon: (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  ),
                },
                {
                  label: "ตอนรวม",
                  value: mangas.reduce((s, m) => s + (m._count.chapters ?? 0), 0),
                  color: "text-text",
                  iconBg: "bg-white/10",
                  icon: (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  ),
                },
                {
                  label: "ยอดวิวรวม",
                  value: totalMangaViews.toLocaleString(),
                  color: "text-blue-400",
                  iconBg: "bg-blue-400/20",
                  icon: (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ),
                },
                {
                  label: "กำลังดำเนิน",
                  value: mangas.filter((m) => m.status === "Ongoing").length,
                  color: "text-green-400",
                  iconBg: "bg-green-400/20",
                  icon: (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ),
                },
              ].map((s) => (
                <div key={s.label} className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                    {s.icon}
                  </div>
                  <div>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <svg width="14" height="14" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>
              </svg>
              <input
                value={searchManga}
                onChange={(e) => setSearchManga(e.target.value)}
                placeholder="ค้นหาการ์ตูน..."
                className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
              />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-bg border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">การ์ตูน</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">ตอน</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">ยอดวิว</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">สถานะ</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMangas.map((manga) => (
                    <tr key={manga.id} className="hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-12 flex-shrink-0 rounded-md overflow-hidden bg-bg border border-border">
                            {manga.coverImage ? (
                              <Image src={manga.coverImage} alt={manga.title} fill className="object-cover" />
                            ) : (
                              <div className="absolute inset-0 bg-border/30" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-text text-sm font-semibold truncate max-w-[180px]">{manga.title}</p>
                            <p className="text-muted text-xs">ID: {manga.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text text-sm hidden md:table-cell">{manga._count.chapters}</td>
                      <td className="px-4 py-3 text-muted text-sm hidden md:table-cell">{(manga.viewCount ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[manga.status] ?? "text-muted bg-muted/10 border-border"}`}>
                          {STATUS_LABEL[manga.status] ?? manga.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/dashboard/manga/${manga.id}`}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-bg text-muted hover:border-accent/40 hover:text-accent transition-colors"
                          >
                            จัดการตอน
                          </Link>
                          <Link
                            href={`/manga/${manga.id}`}
                            target="_blank"
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-bg text-muted hover:border-accent/40 hover:text-accent transition-colors"
                          >
                            ดู ↗
                          </Link>
                          <button
                            onClick={() => { setEditModal(manga); setEditForm({ title: manga.title, status: manga.status, genre: manga.genre ?? "" }); }}
                            className="p-1.5 rounded-lg border border-border bg-bg text-muted hover:border-accent/40 hover:text-accent transition-colors"
                            title="แก้ไข"
                          >
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteModal(manga)}
                            className="p-1.5 rounded-lg border border-border bg-bg text-muted hover:border-red-400/40 hover:text-red-400 transition-colors"
                            title="ลบ"
                          >
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMangas.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-muted text-sm">ไม่พบการ์ตูน</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {!loading && tab === "users" && (
        <div>
          {users.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "ผู้ใช้ทั้งหมด", value: users.length, color: "text-accent" },
                { label: "Admin", value: users.filter((u) => u.role === "ADMIN").length, color: "text-red-400" },
                { label: "เหรียญรวมในระบบ", value: users.reduce((s, u) => s + u.coins, 0).toLocaleString(), color: "text-yellow-400" },
              ].map((s) => (
                <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-xs text-muted mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <svg width="14" height="14" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>
              </svg>
              <input
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="ค้นหาผู้ใช้..."
                className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
              />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-bg border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">ผู้ใช้</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">เหรียญ</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">สมัครเมื่อ</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-text text-sm font-semibold">{u.name}</p>
                        <p className="text-muted text-xs">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          u.role === "ADMIN"
                            ? "bg-red-400/10 text-red-400 border-red-400/20"
                            : "bg-muted/10 text-muted border-border"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-accent font-bold text-sm">{u.coins.toLocaleString()}</span>
                        <span className="text-muted text-xs ml-1">เหรียญ</span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs hidden md:table-cell">{(() => { const d = new Date(u.createdAt); const m = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]; return `${d.getDate()}/${m[d.getMonth()]}/${d.getFullYear()+543}`; })()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setUpdateRoleModal(u)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-bg text-muted hover:border-accent/40 hover:text-accent transition-colors"
                          >
                            Role
                          </button>
                          <button
                            onClick={() => { setCoinsModal(u); setCoinsAmount(""); }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-bg text-muted hover:border-yellow-400/40 hover:text-yellow-400 transition-colors"
                          >
                            เหรียญ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-muted text-sm">ไม่พบผู้ใช้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REVENUE TAB */}
      {!loading && tab === "revenue" && revenue && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-6">
            {[
              { label: "รายได้รวม", value: `${(revenue.totalCoins ?? 0).toLocaleString()} เหรียญ`, color: "text-accent" },
              { label: "การซื้อรวม", value: `${revenue.totalPurchases ?? 0} รายการ`, color: "text-text" },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold text-text">ประวัติการซื้อ</h3>
              {/* Revenue search — client-side filter by name/email */}
              <div className="relative w-full sm:max-w-xs">
                <svg width="14" height="14" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>
                </svg>
                <input
                  value={searchRevenue}
                  onChange={(e) => setSearchRevenue(e.target.value)}
                  placeholder="ค้นหาชื่อ / อีเมล..."
                  className="w-full bg-bg border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-bg border-b border-border">
                  <tr>
                    {["ผู้ใช้", "ตอน", "จำนวน", "วันที่"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRevenuePurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-text text-sm font-medium">{p.user?.name}</p>
                        <p className="text-muted text-xs">{p.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-text text-sm">Ch.{p.chapter?.chapterNumber}</td>
                      <td className="px-4 py-3">
                        <span className="text-accent font-bold text-sm">{p.paidAmount}</span>
                        <span className="text-muted text-xs ml-1">เหรียญ</span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{(() => { const d = new Date(p.createdAt); const m = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"]; return `${d.getDate()}/${m[d.getMonth()]}/${d.getFullYear()+543}`; })()}</td>
                    </tr>
                  ))}
                  {filteredRevenuePurchases.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-10 text-muted text-sm">{searchRevenue ? "ไม่พบผลลัพธ์" : "ยังไม่มีการซื้อ"}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Update Role */}
      {updateRoleModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-1 text-text">เปลี่ยน Role</h2>
            <p className="text-muted text-sm mb-5">{updateRoleModal.name}</p>
            <div className="space-y-2 mb-6">
              {(["USER", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUpdateRoleModal({ ...updateRoleModal, role: r })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                    updateRoleModal.role === r ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${updateRoleModal.role === r ? "border-accent" : "border-muted"}`}>
                    {updateRoleModal.role === r && <span className="w-2 h-2 rounded-full bg-accent block" />}
                  </span>
                  <span className={`text-sm font-semibold ${updateRoleModal.role === r ? "text-accent" : "text-text"}`}>{r}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleUpdateRole(updateRoleModal.id, updateRoleModal.role)} className="flex-1 bg-accent text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors">บันทึก</button>
              <button onClick={() => setUpdateRoleModal(null)} className="flex-1 bg-bg border border-border text-text font-semibold px-4 py-2 rounded-lg text-sm hover:bg-border transition-colors">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Coins */}
      {coinsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-1 text-text">ปรับเหรียญ</h2>
            <p className="text-muted text-sm mb-1">{coinsModal.name}</p>
            <p className="text-xs text-muted mb-5">เหรียญปัจจุบัน: <span className="text-accent font-bold">{coinsModal.coins}</span></p>
            <p className="text-xs text-muted mb-2">ใส่จำนวน (+ เพิ่ม / - ลด)</p>
            <input
              type="number"
              value={coinsAmount}
              onChange={(e) => setCoinsAmount(e.target.value)}
              placeholder="เช่น 100 หรือ -50"
              className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text outline-none focus:border-white/40 transition-colors mb-5"
            />
            <div className="flex gap-2">
              <button onClick={handleUpdateCoins} className="flex-1 bg-accent text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors">บันทึก</button>
              <button onClick={() => setCoinsModal(null)} className="flex-1 bg-bg border border-border text-text font-semibold px-4 py-2 rounded-lg text-sm transition-colors">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Manga */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-text">แก้ไขการ์ตูน</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-muted mb-1">ชื่อเรื่อง</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">สถานะ</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">ประเภท</label>
                <select
                  value={editForm.genre}
                  onChange={(e) => setEditForm((f) => ({ ...f, genre: e.target.value }))}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-white/40 transition-colors"
                >
                  <option value="">-- เลือกประเภท --</option>
                  {MAIN_GENRES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEditSave}
                disabled={editSaving || !editForm.title.trim()}
                className="flex-1 bg-accent text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {editSaving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 bg-bg border border-border text-text font-semibold px-4 py-2 rounded-lg text-sm hover:bg-border transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Manga */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-1 text-text">ลบการ์ตูน</h2>
            <p className="text-sm text-muted mb-2 truncate">{deleteModal.title}</p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-red-400 text-sm">ข้อมูลทั้งหมดจะถูกลบถาวร รวมถึงตอนและความคิดเห็น</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                ลบถาวร
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 bg-bg border border-border text-text font-semibold px-4 py-2 rounded-lg text-sm hover:bg-border transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
