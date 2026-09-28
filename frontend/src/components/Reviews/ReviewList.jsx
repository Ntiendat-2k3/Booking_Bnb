"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import Avatar from "@/components/atoms/Avatar";
import Button from "@/components/atoms/Button";
import Stars from "./Stars";

export default function ReviewList({ loading, items, meta, load }) {
  const t = useTranslations();

  if (loading) {
    return <div className="mt-5 text-sm text-muted-ink">{t("common.loading")}</div>;
  }

  if (items.length === 0) {
    return <div className="mt-5 text-sm text-muted-ink">{t("reviews.empty")}</div>;
  }

  return (
    <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {items.map((rv) => (
          <article key={rv.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={rv.reviewer?.avatar_url || "https://i.pravatar.cc/150"}
                name={rv.reviewer?.full_name || t("reviews.user")}
                size={36}
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">
                  {rv.reviewer?.full_name || t("reviews.user")}
                </div>
                <div className="mt-0.5">
                  <Stars value={rv.rating} />
                </div>
              </div>
            </div>
            {rv.comment && (
              <p className="mt-3 text-sm leading-6 text-muted-ink">{rv.comment}</p>
            )}
          </article>
        ))}
      </div>

      {meta.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => load(meta.page - 1)}
          >
            {t("common.previous")}
          </Button>
          <div className="text-sm text-muted-ink">
            {t("reviews.page", {
              page: meta.page,
              total: meta.total_pages,
            })}
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={meta.page >= meta.total_pages}
            onClick={() => load(meta.page + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      )}
    </>
  );
}
