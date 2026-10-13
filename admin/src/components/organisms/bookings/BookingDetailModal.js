"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import { statusTone, paymentTone, money, fmtDate } from "@/lib/BookingUtils";

export default function BookingDetailModal({ detailOpen, setDetailOpen, detail, detailLoading }) {
  const t = useTranslations();
  const { locale } = useLocale();
  return (
    <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={t("bookings.information")}
        description={detail?.id ? `#${detail.id}` : ""}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetailOpen(false)}>
            {t("common.close")}
          </Button>
        }
      >
        {detailLoading ? (
          <div className="py-8 text-sm ui-muted">{t("common.loading")}</div>
        ) : detail ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border ui-border ui-panel-2">
              <div className="text-sm font-semibold">{t("common.details")}</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">{t("common.status")}:</span>{" "}
                  <Badge tone={statusTone(detail.status)}>
                    {t(`statuses.${detail.status}`)}
                  </Badge>
                </div>
                <div>
                  <span className="ui-muted">{t("common.checkIn")}:</span>{" "}
                  {detail.check_in || "—"}
                </div>
                <div>
                  <span className="ui-muted">{t("common.checkOut")}:</span>{" "}
                  {detail.check_out || "—"}
                </div>
                <div>
                  <span className="ui-muted">{t("common.total")}:</span>{" "}
                  <span className="font-semibold">
                    {money(detail.total_amount, locale)} ₫
                  </span>
                </div>
                <div>
                  <span className="ui-muted">{t("common.created")}:</span>{" "}
                  {fmtDate(detail.created_at, locale)}
                </div>
              </div>
            </div>

            <div className="p-4 border ui-border ui-panel-2">
              <div className="text-sm font-semibold">{t("reviews.userListing")}</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">{t("common.user")}:</span>{" "}
                  {detail.guest?.email || "—"}{" "}
                  <span className="font-mono text-xs ui-muted-2">
                    ({detail.guest?.id || "—"})
                  </span>
                </div>
                <div>
                  <span className="ui-muted">{t("common.listing")}:</span>{" "}
                  {detail.listing?.title || "—"}{" "}
                  <span className="font-mono text-xs ui-muted">
                    ({detail.listing?.id || "—"})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border ui-border ui-panel-2 md:col-span-2">
              <div className="text-sm font-semibold">{t("nav.payments")}</div>
              <div className="mt-3 overflow-hidden border ui-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 ui-muted">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">{t("common.provider")}</th>
                      <th className="px-3 py-2">{t("common.status")}</th>
                      <th className="px-3 py-2">{t("common.amount")}</th>
                      <th className="px-3 py-2">{t("common.created")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.payments || []).map((p) => (
                      <tr key={p.id} className="border-t ui-border">
                        <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                        <td className="px-3 py-2">{p.provider || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge tone={paymentTone(p.status)}>
                            {p.status ? t(`statuses.${p.status}`) : "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{money(p.amount, locale)} ₫</td>
                        <td className="px-3 py-2">{fmtDate(p.created_at, locale)}</td>
                      </tr>
                    ))}
                    {!(detail.payments || []).length ? (
                      <tr>
                        <td className="px-3 py-6 ui-muted" colSpan={5}>
                          {t("bookings.noPayments")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border ui-border ui-panel-2 md:col-span-2">
              <div className="text-sm font-semibold">{t("common.review")}</div>
              {detail.review ? (
                <div className="p-4 mt-2 text-sm bg-white/5 ui-fg">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {detail.review.rating}★
                    </span>
                    <span className="ui-muted">•</span>
                    <span className="text-xs ui-muted">
                      {fmtDate(detail.review.created_at, locale)}
                    </span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap ui-muted">
                    {detail.review.comment || "—"}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm ui-muted">{t("bookings.noReview")}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-sm ui-muted">{t("common.noResults")}</div>
        )}
      </Modal>
  );
}
