"use client";

import { useEffect, useMemo, useState } from "react";
import { getReviews, getMyReview, createReview, updateReview, deleteReview } from "@/services/reviewService";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { toInt } from "./Stars";
import ReviewComposer from "./ReviewComposer";
import ReviewList from "./ReviewList";

export default function ReviewsSection({ listingId, initialAvg, initialCount, autoFocusComposer = false }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 6, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);

  const [mine, setMine] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const avg = useMemo(() => {
    if (typeof initialAvg === "number") return initialAvg;
    const n = Number(initialAvg);
    return Number.isFinite(n) ? n : null;
  }, [initialAvg]);

  async function load(page = 1) {
    setLoading(true);
    try {
      const res = await getReviews(listingId, page, 6);
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
      const res = await getMyReview(listingId);
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

  async function submit() {
    setSaving(true);
    try {
      if (mine?.id) {
        await updateReview(mine.id, rating, comment);
        notifySuccess("Đã cập nhật đánh giá");
      } else {
        await createReview(listingId, rating, comment);
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
    if (!confirm("Xóa đánh giá này?")) return;
    try {
      await deleteReview(mine.id);
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

      <ReviewComposer
        mine={mine}
        canReview={canReview}
        rating={rating}
        setRating={setRating}
        comment={comment}
        setComment={setComment}
        submit={submit}
        remove={remove}
        saving={saving}
        autoFocusComposer={autoFocusComposer}
      />

      <ReviewList
        loading={loading}
        items={items}
        meta={meta}
        load={load}
      />
    </section>
  );
}
