"use client";

import Link from "next/link";
import { notifyInfo } from "@/lib/notify";
import { useEffect, useRef } from "react";

export default function ReviewComposer({
  mine,
  canReview,
  rating,
  setRating,
  comment,
  setComment,
  submit,
  remove,
  saving,
  autoFocusComposer
}) {
  const commentRef = useRef(null);
  const didAutoFocus = useRef(false);

  useEffect(() => {
    if (!autoFocusComposer) return;
    if (didAutoFocus.current) return;
    if (!mine && !canReview) return; // not eligible

    didAutoFocus.current = true;
    setTimeout(() => {
      const el = document.getElementById("reviews");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      commentRef.current?.focus();
    }, 50);
  }, [autoFocusComposer, mine, canReview]);

  const disabled = !mine && !canReview;

  return (
    <div className="mt-4 rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">
          {mine ? "Đánh giá của bạn" : "Viết đánh giá"}
        </div>
        {!mine && !canReview && (
          <div className="text-xs text-slate-500">
            * Bạn chỉ có thể đánh giá sau khi đã ở và checkout.
          </div>
        )}
      </div>

      {!mine && !canReview && (
        <div className="mt-2 text-sm text-slate-600">
          Nếu bạn đã có chuyến đi phù hợp mà chưa thấy nút đánh giá, hãy vào <Link href="/trips" className="underline">Chuyến đi</Link>.
        </div>
      )}

      <div className={`mt-3 grid gap-3 ${disabled ? "opacity-60" : ""}`}>
        <label className="text-sm font-medium">
          Số sao
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            disabled={disabled || saving}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Nhận xét
          <textarea
            ref={commentRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder={disabled ? "Checkout xong bạn sẽ viết được đánh giá ở đây." : "Chia sẻ trải nghiệm của bạn..."}
            disabled={disabled || saving}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (disabled) {
                notifyInfo("Bạn cần checkout trước khi đánh giá");
                return;
              }
              submit();
            }}
            disabled={saving || disabled}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mine ? "Cập nhật" : "Gửi đánh giá"}
          </button>
          {mine && (
            <button
              onClick={remove}
              disabled={saving}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Xóa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
