"use client";

import { useEffect, useRef, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

const reasonOptions = ["plansChanged", "datesWrong", "foundAnotherStay", "paymentIssue", "other"];

/** Backend tính lại tiền hoàn khi xác nhận; dialog chỉ trình bày báo giá đang có hiệu lực. */
export default function CancellationDialog({ bookingId, onClose, onCancelled }) {
  const dialogRef = useRef(null);
  const { t, locale } = useLocale();
  const [quote, setQuote] = useState(null);
  const [reasonCode, setReasonCode] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const money = (value) => formatVND(value, locale === "en" ? "en-US" : "vi-VN");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    let active = true;
    apiFetch(`/api/v1/bookings/${bookingId}/cancellation-quote`)
      .then((response) => { if (active) setQuote(response.data); })
      .catch(() => { if (active) setError(t("cancellation.quoteFailed")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; dialog?.close(); };
  }, [bookingId, t]);

  async function confirm() {
    if (!quote || busy || !reasonCode || (reasonCode === "other" && otherReason.trim().length < 3)) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/v1/bookings/${bookingId}/cancel`, { method: "POST",
        body: { expected_refund_amount: Number(quote.refund_amount),
          reason: reasonCode === "other" ? otherReason.trim() : t(`cancellation.reasons.${reasonCode}`) } });
      onCancelled();
    } catch (failure) {
      if (failure?.status === 409) {
        setError(t("cancellation.quoteChanged"));
        try {
          const response = await apiFetch(`/api/v1/bookings/${bookingId}/cancellation-quote`);
          setQuote(response.data);
        } catch { setQuote(null); }
      } else setError(t("trips.cancelFailed"));
    } finally { setBusy(false); }
  }

  return <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="w-[calc(100%-2rem)] max-w-[520px] max-h-[90dvh] overflow-y-auto rounded-panel border border-line bg-surface p-0 text-ink shadow-soft backdrop:bg-[#07160e]/75">
    <div className="space-y-5 p-5 sm:p-7">
      <header className="flex items-start gap-3"><WarningCircle aria-hidden size={26} className="shrink-0 text-caution" />
        <div><h2 className="text-xl font-bold">{t("cancellation.confirmTitle")}</h2>
          <p className="mt-1 text-sm text-muted-ink">{t("cancellation.confirmHint")}</p></div>
      </header>
      {loading ? <p role="status" className="text-sm text-muted-ink">{t("common.loading")}</p> : quote && <>
        <div className="rounded-control border border-line bg-muted-surface/40 p-4 text-sm">
          <p className="font-semibold">{t(`cancellation.${quote.policy.code}`)}</p>
          <p className="mt-1 text-muted-ink">{t(`cancellation.${quote.policy.code}Description`)}</p>
          <p className="mt-1 text-xs text-muted-ink">{t("cancellation.grace")}</p>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3"><dt>{t("cancellation.paid")}</dt><dd className="font-semibold">{money(quote.paid_amount)}</dd></div>
          <div className="flex justify-between gap-3 text-positive"><dt>{t("cancellation.refund")}</dt><dd className="font-bold">{money(quote.refund_amount)}</dd></div>
          <div className="flex justify-between gap-3 border-t border-line pt-3"><dt>{t("cancellation.fee")}</dt><dd className="font-semibold">{money(quote.non_refundable_amount)}</dd></div>
        </dl>
        <p className="text-xs leading-5 text-muted-ink">{quote.payment_state === "unpaid" ? t("cancellation.unpaid") : t("cancellation.processing")}</p>
        <label className="grid gap-2 text-sm font-semibold">{t("cancellation.reason")}
          <select className="field-control" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}>
            <option value="">{t("cancellation.chooseReason")}</option>
            {reasonOptions.map((code) => <option key={code} value={code}>{t(`cancellation.reasons.${code}`)}</option>)}
          </select>
        </label>
        {reasonCode === "other" && <label className="grid gap-2 text-sm font-semibold">{t("cancellation.otherReason")}
          <textarea className="field-control min-h-20" maxLength={500} value={otherReason}
            onChange={(event) => setOtherReason(event.target.value)} />
        </label>}
      </>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>{t("common.back")}</Button>
        <Button onClick={confirm} disabled={!quote || loading || !reasonCode ||
          (reasonCode === "other" && otherReason.trim().length < 3)} loading={busy}>{t("cancellation.confirmAction")}</Button>
      </div>
    </div>
  </dialog>;
}
