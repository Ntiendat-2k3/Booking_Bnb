"use client";

import { useEffect, useMemo, useState } from "react";
import { getReviews, getMyReview, createReview, updateReview, deleteReview } from "@/services/reviewService";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import { toInt } from "./Stars";
import ReviewComposer from "./ReviewComposer";
import ReviewList from "./ReviewList";

export default function ReviewsSection({
  listingId,
  initialAvg,
  initialCount,
  initialItems = [],
  autoFocusComposer = false,
}) {
  const t = useTranslations();
  const [items, setItems] = useState(() => initialItems);
  const [meta, setMeta] = useState(() => ({
    page: 1,
    limit: 6,
    total: initialCount ?? initialItems.length,
    total_pages: 1,
  }));
  const [loading, setLoading] = useState(false);

  const [mine, setMine] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

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
      notifyError(e?.message || t("reviews.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  function applyMine(res) {
    const review = res?.data?.review || null;
    setMine(review);
    setCanReview(Boolean(res?.data?.can_review));
    setRating(review ? toInt(review.rating, 5) : 5);
    setComment(review?.comment || "");
  }

  async function loadMine() {
    const res = await getMyReview(listingId).catch(() => null);
    applyMine(res);
  }

  useEffect(() => {
    let active = true;
    getMyReview(listingId).then((res) => { if (active) applyMine(res); })
      .catch(() => { if (active) applyMine(null); });
    return () => { active = false; };
  }, [listingId]);

  async function submit() {
    setSaving(true);
    try {
      let savedReview;
      if (mine?.id) {
        const res = await updateReview(mine.id, rating, comment);
        savedReview = res?.data;
        notifySuccess(t("reviews.updated"));
      } else {
        const res = await createReview(listingId, rating, comment);
        savedReview = res?.data;
        notifySuccess(t("reviews.created"));
      }
      if (savedReview?.id) {
        setMine(savedReview);
        setCanReview(false);
        setRating(toInt(savedReview.rating, 5));
        setComment(savedReview.comment || "");
      } else {
        await loadMine();
      }
      setEditing(false);
      await load(1);
    } catch (e) {
      if (e?.status === 401) {
        notifyInfo(t("reviews.loginRequired"));
        return;
      }
      notifyError(e?.message || t("reviews.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!mine?.id) return;
    if (!confirm(t("reviews.deleteConfirm"))) return;
    try {
      await deleteReview(mine.id);
      notifySuccess(t("reviews.deleted"));
      setMine(null);
      setCanReview(false);
      setRating(5);
      setComment("");
      setEditing(false);
      await load(1);
      await loadMine();
    } catch (e) {
      notifyError(e?.message || t("reviews.deleteFailed"));
    }
  }

  return (
    <section id="reviews" className="scroll-mt-32 border-b border-line pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">
            {t("reviews.title")}
          </h2>
          <div className="mt-1 text-sm text-muted-ink">
            {avg !== null ? (
              <span>
                <span className="font-semibold text-ink">{avg.toFixed(1)}</span>
                {" · "}
                {t("reviews.count", { count: meta.total })}
              </span>
            ) : (
              <span>
                {t("reviews.count", { count: meta.total })}
              </span>
            )}
          </div>
        </div>
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
        editing={editing}
        onEdit={() => {
          setRating(toInt(mine.rating, 5));
          setComment(mine.comment || "");
          setEditing(true);
        }}
        onCancel={() => {
          setRating(toInt(mine.rating, 5));
          setComment(mine.comment || "");
          setEditing(false);
        }}
      />

      {(loading || items.some((item) => item.id !== mine?.id) || !mine) && (
        <ReviewList
          loading={loading}
          items={mine ? items.filter((item) => item.id !== mine.id) : items}
          meta={meta}
          load={load}
        />
      )}
    </section>
  );
}
