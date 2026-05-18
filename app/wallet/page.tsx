"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface TopupRecord {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
}

const STATUS_FILTER_OPTIONS = [
  { label: "ทั้งหมด", value: "all" },
  { label: "สำเร็จ", value: "approved" },
  { label: "รอดำเนินการ", value: "pending" },
  { label: "ปฏิเสธ", value: "rejected" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    approved: {
      label: "สำเร็จ",
      className:
        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    pending: {
      label: "รอดำเนินการ",
      className: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    },
    rejected: {
      label: "ปฏิเสธ",
      className: "bg-red-500/20 text-red-400 border border-red-500/30",
    },
  };
  const entry = map[status] ?? {
    label: status,
    className: "bg-surface text-muted border border-border",
  };
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function WalletPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<TopupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const user = session?.user as { coins?: number } | undefined;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/wallet");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/wallet/history")
      .then((r) => r.json())
      .then((data) => setHistory(data.history ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered =
    filter === "all" ? history : history.filter((r) => r.status === filter);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Balance card */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <p className="text-sm font-semibold text-muted mb-3">เหรียญ</p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪙</span>
            <span className="text-3xl font-bold text-text">
              {user?.coins ?? 0}
            </span>
            <span className="text-base text-muted font-medium">เหรียญ</span>
          </div>
          <Link
            href="/topup"
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            เติมเหรียญ
          </Link>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-text">ประวัติเติมเหรียญ</p>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-bg border border-border text-text text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm">
            ยังไม่มีประวัติการเติมเหรียญ
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-text text-sm">
                    {record.amount} THB → {record.amount} เหรียญ
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(record.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={record.status} />
                  <Link
                    href={`/topup?ref=${record.id}`}
                    className="text-xs font-medium text-muted bg-bg hover:bg-border border border-border px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                  >
                    คิวอาร์โค้ด
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
