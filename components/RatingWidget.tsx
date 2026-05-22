"use client";

import { useState, useEffect } from "react";

interface Props {
  mangaId: number;
  isLoggedIn: boolean;
}

interface RatingData {
  avg: number | null;
  count: number;
  userScore: number | null;
}

export default function RatingWidget({ mangaId, isLoggedIn }: Props) {
  const [data, setData] = useState<RatingData | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/ratings?mangaId=${mangaId}`)
      .then((r) => r.json())
      .then((d: RatingData) => setData(d))
      .catch(() => {});
  }, [mangaId]);

  async function handleRate(score: number) {
    if (!isLoggedIn || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId, score }),
      });
      if (res.ok) {
        const json = await res.json();
        setData({ avg: json.avg, count: json.count, userScore: score });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const displayStar = hoveredStar || data?.userScore || 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHoveredStar(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={!isLoggedIn || submitting}
            onClick={() => handleRate(star)}
            onMouseEnter={() => isLoggedIn && setHoveredStar(star)}
            className={`text-xl leading-none transition-colors ${
              isLoggedIn ? "cursor-pointer" : "cursor-default"
            } ${star <= displayStar ? "text-yellow-400" : "text-muted/30"}`}
            title={isLoggedIn ? `ให้ ${star} ดาว` : "เข้าสู่ระบบเพื่อให้คะแนน"}
          >
            ★
          </button>
        ))}
      </div>

      {data && (
        <span className="text-sm text-muted">
          {data.avg !== null ? (
            <>
              <span className="text-text font-semibold">{data.avg}</span>
              <span className="ml-1">({data.count} รีวิว)</span>
            </>
          ) : (
            "ยังไม่มีคะแนน"
          )}
        </span>
      )}
    </div>
  );
}
