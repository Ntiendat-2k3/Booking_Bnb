"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import Modal from "@/components/molecules/Modal";
import { Stars } from "./ReviewsTable";
import { fmtDate } from "@/lib/BookingUtils";

export default function ReviewDetailModal({ view, setView }) {
  const t = useTranslations();
  const { locale } = useLocale();
  return (
    <Modal
      open={!!view}
      onClose={() => setView(null)}
      title={t("reviews.information")}
      description={view ? `#${view.id}` : ""}
      size="lg"
      footer={
        <Button variant="secondary" onClick={() => setView(null)}>
          {t("common.close")}
        </Button>
      }
    >
      {view ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 border ui-border">
            <div className="text-sm font-semibold">{t("common.metadata")}</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">{t("common.rating")}:</span>{" "}
                <Stars rating={view.rating} />
              </div>
              <div>
                <span className="ui-muted">{t("common.visibility")}:</span>{" "}
                <Badge tone={view.is_hidden ? "rose" : "emerald"}>
                  {t(view.is_hidden ? "statuses.hidden" : "statuses.visible")}
                </Badge>
              </div>
              <div>
                <span className="ui-muted">{t("common.created")}:</span>{" "}
                {fmtDate(view.created_at, locale)}
              </div>
            </div>
          </div>

          <div className="p-4 border ui-border">
            <div className="text-sm font-semibold">{t("reviews.userListing")}</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">{t("common.user")}:</span>{" "}
                {view.reviewer?.email || "—"}{" "}
                <span className="font-mono text-xs ui-muted">
                  ({view.reviewer?.id || "—"})
                </span>
              </div>
              <div>
                <span className="ui-muted">{t("common.listing")}:</span>{" "}
                {view.listing?.title || "—"}{" "}
                <span className="font-mono text-xs ui-muted">
                  ({view.listing?.listing_code || "—"})
                </span>
              </div>
              <div>
                <span className="ui-muted">{t("common.booking")}:</span>{" "}
                <span className="font-mono text-xs">
                  {view.booking?.booking_code || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border ui-border md:col-span-2">
            <div className="text-sm font-semibold">{t("common.comment")}</div>
            <div className="p-4 mt-2 text-sm whitespace-pre-wrap bg-white/5 ui-muted">
              {view.comment || "—"}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
