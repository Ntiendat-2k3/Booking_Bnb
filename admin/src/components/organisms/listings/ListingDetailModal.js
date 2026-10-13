"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";
import StatusBadge from "@/components/molecules/StatusBadge";
import { ExternalLink } from "lucide-react";
import { money } from "@/lib/BookingUtils";

export default function ListingDetailModal({ view, setView }) {
  const t = useTranslations();
  const { locale } = useLocale();
  const frontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";

  return (
    <Modal
      open={!!view}
      onClose={() => setView(null)}
      title={t("listings.information")}
      description={view ? `#${view.id} • ${view.title || t("common.untitled")}` : ""}
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <Button
            onClick={() =>
              window.open(`${frontendUrl}/rooms/${view?.id}`, "_blank")
            }
            variant="primary"
          >
            <ExternalLink className="w-4 h-4" />
            {t("common.goToPage")}
          </Button>
          <Button variant="secondary" onClick={() => setView(null)}>
            {t("common.close")}
          </Button>
        </div>
      }
    >
      {view ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 border ui-border">
            <div className="text-sm font-semibold">{t("common.summary")}</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">{t("common.status")}:</span>{" "}
                <StatusBadge status={view.status} />
              </div>
              <div>
                <span className="ui-muted">{t("common.city")}:</span> {view.city || "—"}
              </div>
              <div>
                <span className="ui-muted">{t("common.host")}:</span>{" "}
                {view.host?.full_name || "—"} ({view.host?.email || "—"})
              </div>
              {view.price_per_night != null ? (
                <div>
                  <span className="ui-muted">{t("common.pricePerNight")}:</span>{" "}
                  {money(view.price_per_night, locale)} ₫
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-4 border ui-border">
            <div className="text-sm font-semibold">{t("common.details")}</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">{t("common.address")}:</span>{" "}
                {view.address || "—"}
              </div>
              <div>
                <span className="ui-muted">{t("common.guests")}:</span>{" "}
                {view.max_guests || "—"} • {t("common.bedrooms")}: {view.bedrooms || "—"} •
                {t("common.beds")}: {view.beds || "—"} • {t("common.baths")}: {view.bathrooms || "—"}
              </div>
              <div className="pt-2">
                <div className="text-xs font-semibold ui-muted">
                  {t("common.description")}
                </div>
                <div className="p-3 mt-1 text-sm whitespace-pre-wrap bg-white/5 ui-muted">
                  {view.description || "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
