"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const THAI_NAMES = [
  { name: "สมศักดิ์", slug: "somsak" },
  { name: "สมหมาย", slug: "sommai" },
  { name: "สมชาย", slug: "somchai" },
  { name: "วิชัย", slug: "wichai" },
  { name: "สุชาติ", slug: "suchat" },
  { name: "ประสิทธิ์", slug: "prasit" },
  { name: "มานะ", slug: "mana" },
  { name: "สุดา", slug: "suda" },
  { name: "กมล", slug: "kamol" },
  { name: "อรุณ", slug: "arun" },
  { name: "เอกชัย", slug: "ekachai" },
  { name: "พิชัย", slug: "pichai" },
  { name: "บุญมี", slug: "boonmee" },
  { name: "สุรชัย", slug: "surachai" },
  { name: "นิรมล", slug: "niramond" },
  { name: "วิไล", slug: "wilai" },
];

function generateGuestIdentity(): { name: string; email: string } {
  const pick = THAI_NAMES[Math.floor(Math.random() * THAI_NAMES.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return { name: pick.name, email: `${pick.slug}${num}@mangbo.com` };
}

interface CommentUser {
  id: number;
  name: string;
  image: string | null;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  isGuest: boolean;
  guestName: string | null;
  user: CommentUser | null;
  replies: Comment[];
}

interface Props {
  mangaId: number;
  currentUserId: number | null;
  isAdmin: boolean;
  initialComments: Comment[];
}

function formatThaiDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getDisplayName(c: Comment): string {
  if (c.isGuest || c.user === null) return c.guestName ?? "ผู้เยี่ยมชม";
  return c.user.name;
}

function getAvatarLetter(c: Comment): string {
  return (getDisplayName(c)[0] ?? "U").toUpperCase();
}

function Avatar({ comment, size = 8 }: { comment: Comment; size?: number }) {
  const sizeClass = size === 6 ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  return (
    <div
      className={`${sizeClass} rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold flex-shrink-0 overflow-hidden ring-2 ring-white`}
    >
      {!comment.isGuest && comment.user?.image ? (
        <Image
          src={comment.user.image}
          alt={comment.user.name}
          width={size === 6 ? 24 : 32}
          height={size === 6 ? 24 : 32}
          className="object-cover w-full h-full"
        />
      ) : (
        getAvatarLetter(comment)
      )}
    </div>
  );
}

export default function CommentSection({
  mangaId,
  currentUserId,
  isAdmin,
  initialComments,
}: Props) {
  const [comments, setComments] = useState<Comment[]>(
    initialComments.map((c) => ({ ...c, replies: c.replies ?? [] })),
  );
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showToast, setShowToast] = useState(false);

  const isLoggedIn = currentUserId !== null;

  useEffect(() => {
    if (isLoggedIn) return;
    const storedName = sessionStorage.getItem("guest_name");
    const storedEmail = sessionStorage.getItem("guest_email");
    if (storedName && storedEmail) {
      setGuestName(storedName);
      setGuestEmail(storedEmail);
    } else {
      const identity = generateGuestIdentity();
      sessionStorage.setItem("guest_name", identity.name);
      sessionStorage.setItem("guest_email", identity.email);
      setGuestName(identity.name);
      setGuestEmail(identity.email);
    }
  }, [isLoggedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);

    const body = isLoggedIn
      ? { mangaId, content }
      : { mangaId, content, guestName, guestEmail };

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const comment = (await res.json()) as Comment;
      setComments((prev) => [{ ...comment, replies: [] }, ...prev]);
      setContent("");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
    setSubmitting(false);
  }

  async function handleReplySubmit(parentId: number) {
    if (!replyContent.trim() || replySubmitting) return;
    setReplySubmitting(true);

    const body = isLoggedIn
      ? { mangaId, content: replyContent, parentId }
      : { mangaId, content: replyContent, parentId, guestName, guestEmail };

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const reply = (await res.json()) as Comment;
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, { ...reply, replies: [] }] }
            : c,
        ),
      );
      setReplyContent("");
      setReplyingTo(null);
    }
    setReplySubmitting(false);
  }

  async function handleDelete(id: number, parentId?: number) {
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (parentId != null) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: c.replies.filter((r) => r.id !== id) }
              : c,
          ),
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    }
  }

  function canDelete(c: Comment): boolean {
    if (isAdmin) return true;
    if (!isLoggedIn) return false;
    return c.user !== null && c.user.id === currentUserId;
  }

  const totalCount =
    comments.length + comments.reduce((acc, c) => acc + c.replies.length, 0);

  return (
    <div className="mt-10 space-y-3">
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showToast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
      >
        <div className="bg-surface border border-border rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg">
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-green-400 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm text-text font-medium">
            ส่งความคิดเห็นแล้ว
          </span>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-base font-bold text-text">
            ใส่ความเห็น
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-text font-medium">
              ความเห็น <span className="text-accent">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="แสดงความคิดเห็น..."
              rows={5}
              maxLength={1000}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-white/70 resize-none transition-colors"
            />
          </div>

          {!isLoggedIn && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-text font-medium">
                  ชื่อ <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    sessionStorage.setItem("guest_name", e.target.value);
                  }}
                  maxLength={50}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-white/70 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-text font-medium">อีเมล</label>
                <div className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-muted truncate">
                  {guestEmail}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="bg-accent text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {submitting ? "กำลังส่ง..." : "ส่งความเห็น"}
          </button>
        </form>
      </div>

      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className="bg-surface border border-border rounded-xl px-5 py-4"
            >
              <div className="flex gap-3">
                <Avatar comment={c} size={8} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-semibold text-text">
                        {getDisplayName(c)}
                      </span>
                      <p className="text-xs text-muted mt-0.5">
                        {formatThaiDate(c.createdAt)}
                      </p>
                    </div>

                    {canDelete(c) && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-muted hover:text-red-400 transition-colors flex-shrink-0 mt-1"
                        aria-label="ลบความคิดเห็น"
                      >
                        <svg
                          width="13"
                          height="13"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="mt-2 border border-border rounded-lg px-3 py-3 min-h-[100px]">
                    <p className="text-sm text-text leading-relaxed break-words">
                      {c.content}
                    </p>
                  </div>

                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === c.id ? null : c.id);
                        setReplyContent("");
                      }}
                      className="text-xs border border-border text-muted hover:border-accent hover:text-accent transition-colors rounded-full px-3 py-1"
                    >
                      ตอบกลับ
                    </button>
                  </div>
                </div>
              </div>

              {c.replies.length > 0 && (
                <div className="ml-11 mt-3 space-y-3 border-l-2 border-border pl-4">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex gap-2">
                      <Avatar comment={r} size={6} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-text">
                              {getDisplayName(r)}
                            </span>
                            <p className="text-xs text-muted mt-0.5">
                              {formatThaiDate(r.createdAt)}
                            </p>
                          </div>

                          {canDelete(r) && (
                            <button
                              onClick={() => handleDelete(r.id, c.id)}
                              className="text-muted hover:text-red-400 transition-colors flex-shrink-0 mt-1"
                              aria-label="ลบความคิดเห็น"
                            >
                              <svg
                                width="11"
                                height="11"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="mt-1.5 border border-border rounded-lg px-3 py-2">
                          <p className="text-xs text-text leading-relaxed break-words">
                            {r.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === c.id && (
                <div className="ml-10 mt-3 border-l-2 border-accent/40 pl-3">
                  <div className="bg-bg border border-border rounded-lg p-3 space-y-2">
                    {!isLoggedIn && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => {
                            setGuestName(e.target.value);
                            sessionStorage.setItem(
                              "guest_name",
                              e.target.value,
                            );
                          }}
                          maxLength={50}
                          placeholder="ชื่อของคุณ"
                          className="flex-1 bg-surface border border-border rounded-md px-2 py-1 text-xs text-text outline-none focus:border-white/70 transition-colors"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`ตอบกลับ ${getDisplayName(c)}...`}
                        rows={2}
                        maxLength={1000}
                        className="flex-1 bg-surface border border-border rounded-md px-2 py-1.5 text-xs text-text placeholder:text-muted outline-none focus:border-white/70 transition-colors resize-none"
                        autoFocus
                      />
                      <div className="flex flex-col gap-1 self-end">
                        <button
                          onClick={() => handleReplySubmit(c.id)}
                          disabled={replySubmitting || !replyContent.trim()}
                          className="bg-accent text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                          {replySubmitting ? "..." : "ส่ง"}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent("");
                          }}
                          className="text-xs text-muted hover:text-text transition-colors px-3 py-1.5"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <div className="bg-surface border border-border rounded-xl px-5 py-10 text-center">
          <p className="text-sm text-muted">
            ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!
          </p>
        </div>
      )}
    </div>
  );
}
