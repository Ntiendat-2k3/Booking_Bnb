"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import Modal from "@/components/molecules/Modal";
import { getStatusColor } from "./PaymentsTable";
import { fmtDate } from "@/lib/BookingUtils";

export default function PaymentDetailModal({ detailOpen, setDetailOpen, detail }) {
  const t = useTranslations();
  const { locale } = useLocale();
  return (
    <Modal
      open={detailOpen}
      onClose={() => setDetailOpen(false)}
      title={t("payments.information")}
      description={detail ? `${t("common.transactionId")}: ${detail.payment_code || "—"}` : ""}
      size="md"
      footer={
        <Button variant="secondary" onClick={() => setDetailOpen(false)}>
          {t("common.close")}
        </Button>
      }
    >
      {detail ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">{t("common.transactionId")}</div>
            <div className="font-mono">{detail.payment_code || "—"}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">{t("common.booking")}</div>
            <div className="break-all font-mono">{detail.booking?.booking_code || detail.booking_code || "—"}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">{t("common.amount")}</div>
            <div className="font-medium text-lg text-[var(--admin-positive)]">
              {new Intl.NumberFormat(locale === "vn" ? "vi-VN" : "en-US", { style: "currency", currency: detail.currency || "VND" }).format(Number(detail.amount || 0))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">{t("common.provider")}</div>
            <div className="capitalize">{detail.provider || "stripe"}</div>
          </div>
          {(detail.provider_transaction_no || detail.provider_txn_ref) && <div className="col-span-2">
            <div className="mb-1 text-xs font-semibold ui-muted">{t("payments.providerReference")}</div>
            <div className="break-all font-mono">{detail.provider_transaction_no || detail.provider_txn_ref}</div>
          </div>}
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">{t("common.status")}</div>
            <Badge tone={getStatusColor(detail.status)}>{t(`statuses.${detail.status}`)}</Badge>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">{t("common.created")}</div>
            <div>
              {fmtDate(detail.created_at, locale)}
            </div>
          </div>
          {detail.metadata && (
            <div className="col-span-2">
              <div className="mb-1 text-xs font-semibold ui-muted">{t("common.metadata")}</div>
              <pre className="p-3 text-xs overflow-auto bg-black/5 ui-muted">
                {JSON.stringify(detail.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
