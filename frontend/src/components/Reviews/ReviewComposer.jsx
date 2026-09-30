"use client";

import Link from "next/link";
import { notifyInfo } from "@/lib/notify";
import { useEffect, useRef } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Stars from "./Stars";

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
  autoFocusComposer,
  editing,
  onEdit,
  onCancel,
}) {
  const t = useTranslations();
  const commentRef = useRef(null);
  const didAutoFocus = useRef(false);

  useEffect(() => {
    if (!autoFocusComposer) return;
    if (didAutoFocus.current) return;
    if (!mine && !canReview) return;

    didAutoFocus.current = true;
    setTimeout(() => {
      const el = document.getElementById("reviews");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      commentRef.current?.focus();
    }, 50);
  }, [autoFocusComposer, mine, canReview]);

  const disabled = !mine && !canReview;

  if (mine && !editing) {
    return (
      <div className="mt-5 rounded-2xl bg-muted-surface p-5">
        <div className="font-semibold text-ink">{t("reviews.yourReview")}</div>
        <div className="mt-3"><Stars value={mine.rating} /></div>
        {mine.comment && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-ink">{mine.comment}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onEdit} variant="secondary" size="sm">{t("common.edit")}</Button>
          <Button onClick={remove} disabled={saving} variant="secondary" size="sm">{t("common.delete")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl bg-muted-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-ink">
          {mine ? t("reviews.yourReview") : t("reviews.writeReview")}
        </div>
        {!mine && !canReview && (
          <div className="text-xs text-muted-ink">
            {t("reviews.eligibility")}
          </div>
        )}
      </div>

      {!mine && !canReview && (
        <div className="mt-2 text-sm leading-6 text-muted-ink">
          {t("reviews.tripHintBefore")}{" "}
          <Link href="/trips" className="font-semibold text-ink underline">
            {t("reviews.tripHintLink")}
          </Link>
          .
        </div>
      )}

      <div className={`mt-3 grid gap-3 ${disabled ? "opacity-60" : ""}`}>
        <label className="text-sm font-semibold text-ink">
          {t("reviews.rating")}
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-ink focus:ring-4 focus:ring-ink/10"
            disabled={disabled || saving}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-ink">
          {t("reviews.comment")}
          <textarea
            ref={commentRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base font-normal outline-none placeholder:text-muted-ink/70 focus:border-ink focus:ring-4 focus:ring-ink/10"
            placeholder={
              disabled
                ? t("reviews.commentDisabled")
                : t("reviews.commentPlaceholder")
            }
            disabled={disabled || saving}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (disabled) {
                notifyInfo(t("reviews.checkoutRequired"));
                return;
              }
              submit();
            }}
            disabled={saving || disabled}
            size="sm"
          >
            {mine ? t("reviews.update") : t("reviews.send")}
          </Button>
          {mine && (
            <Button
              onClick={onCancel}
              disabled={saving}
              variant="secondary"
              size="sm"
            >
              {t("common.cancel")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
