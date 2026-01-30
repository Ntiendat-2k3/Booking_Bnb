"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { StarIcon } from "@/components/icons";
import Link from "next/link";

function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function Stars({ value }) {
  const v = toInt(value, 0);
  return (
    <div className="flex items-center gap-1">
      <StarIcon className="h-4 w-4 text-slate-900" />
      <span className="text-sm font-semibold">{v}</span>
    </div>
  );
}

export default function ReviewsSection({ listingId, initialAvg, initialCount, autoFocusComposer = false }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 6, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);

  const [mine, setMine] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const commentRef = useRef(null);
  const didAutoFocus = useRef(false);

  const avg = useMemo(() => {
    if (typeof initialAvg === "number") return initialAvg;
    const n = Number(initialAvg);
    return Number.isFinite(n) ? n : null;
  }, [initialAvg]);

  async function load(page = 1) {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/listings/${listingId}/reviews?page=${page}&limit=6`);
      setItems(res.data?.items || []);
      setMeta(res.data?.meta || { page: 1, limit: 6, total: 0, total_pages: 1 });
    } catch (e) {
      notifyError(e?.message || "Không tải được đánh giá");
    } finally {
      setLoading(false);
    }
  }

  async function loadMine() {
    try {
      const res = await apiFetch(`/api/v1/listings/${listingId}/reviews/mine`);
      setMine(res.data?.review || null);
      setCanReview(!!res.data?.can_review);
      if (res.data?.review) {
        setRating(toInt(res.data.review.rating, 5));
        setComment(res.data.review.comment || "");
      }
    } catch (e) {
      // not logged in -> ignore
      setMine(null);
      setCanReview(false);
    }
  }

  useEffect(() => {
    load(1);
    loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  // If redirected from Trips with ?review=1#reviews, focus composer when allowed.
  useEffect(() => {
    if (!autoFocusComposer) return;
    if (didAutoFocus.current) return;
    if (!mine && !canReview) return; // not eligible

    didAutoFocus.current = true;
    // Wait a tick for DOM render.
    setTimeout(() => {
      const el = document.getElementById("reviews");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      commentRef.current?.focus();
    }, 50);
  }, [autoFocusComposer, mine, canReview]);

  async function submit() {
    setSaving(true);
    try {
      if (mine?.id) {
        await apiFetch(`/api/v1/reviews/${mine.id}`, {
          method: "PATCH",
          body: JSON.stringify({ rating, comment }),
        });
        notifySuccess("Đã cập nhật đánh giá");
      } else {
        await apiFetch(`/api/v1/listings/${listingId}/reviews`, {
          method: "POST",
          body: JSON.stringify({ rating, comment }),
        });
        notifySuccess("Đã gửi đánh giá");
      }
      await load(1);
      await loadMine();
    } catch (e) {
      if (e?.status === 401) {
        notifyInfo("Bạn cần đăng nhập để đánh giá");
        return;
      }
      notifyError(e?.message || "Không thể lưu đánh giá");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!mine?.id) return;
    if (!confirm("Xóa đánh giá này?") ) return;
    try {
      await apiFetch(`/api/v1/reviews/${mine.id}`, { method: "DELETE" });
      notifySuccess("Đã xóa đánh giá");
      setMine(null);
      setCanReview(false);
      setRating(5);
      setComment("");
      await load(1);
      await loadMine();
    } catch (e) {
      notifyError(e?.message || "Không thể xóa đánh giá");
    }
  }

  return (
    <section id="reviews" className="scroll-mt-28 rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Đánh giá</h2>
          <div className="mt-1 text-sm text-slate-600">
            {avg !== null ? (
              <span>
                <span className="font-semibold text-slate-900">{avg.toFixed(2)}</span> • {initialCount ?? meta.total} đánh giá
              </span>
            ) : (
              <span>{initialCount ?? meta.total} đánh giá</span>
            )}
          </div>
        </div>
        <button
          onClick={() => load(meta.page)}
          className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          disabled={loading}
        >
          Tải lại
        </button>
      </div>

      {/* My review */}
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

        {(() => {
          const disabled = !mine && !canReview;
          return (
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
                  className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
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
          );
        })()}
      </div>

      {/* List */}
      {loading ? (
        <div className="mt-4 text-slate-600">Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="mt-4 text-slate-600">Chưa có đánh giá nào.</div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((rv) => (
            <div key={rv.id} className="rounded-2xl border p-4">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rv.reviewer?.avatar_url || "https://i.pravatar.cc/150"}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{rv.reviewer?.full_name || "Người dùng"}</div>
                  <div className="mt-0.5">
                    <Stars value={rv.rating} />
                  </div>
                </div>
              </div>
              {rv.comment && <p className="mt-2 text-sm text-slate-700">{rv.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {meta.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            disabled={meta.page <= 1}
            onClick={() => load(meta.page - 1)}
          >
            Trước
          </button>
          <div className="text-sm text-slate-600">
            Trang {meta.page}/{meta.total_pages}
          </div>
          <button
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            disabled={meta.page >= meta.total_pages}
            onClick={() => load(meta.page + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </section>
  );
}
