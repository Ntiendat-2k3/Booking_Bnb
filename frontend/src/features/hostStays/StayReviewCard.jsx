"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CheckCircle } from "@phosphor-icons/react";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";

/** Mỗi khu vực quét hoặc tra cứu giữ riêng dữ liệu thu tiền và lỗi thao tác của booking đang xem. */
export default function StayReviewCard({ booking, listing, purpose, result, alreadyUsed, usedAt,
  stayToday, busy, locked, emptyTitle, emptyHint, onConfirm, onCollect, onNoShow, actionError }) {
  const { t, locale } = useLocale();
  const [collectionMethod, setCollectionMethod] = useState("cash");
  const [collectionAmount, setCollectionAmount] = useState(() =>
    booking?.payment_status === "paid" ? "" : String(booking?.total_amount || ""));
  const [collectionError, setCollectionError] = useState("");
  const [noShowReason, setNoShowReason] = useState("");
  const [noShowError, setNoShowError] = useState("");

  const money = (value) => formatVND(value, locale === "en" ? "en-US" : "vi-VN");
  const resultAt = result?.stay_status === "checked_in" ? result.actual_check_in_at : result?.actual_check_out_at;
  const canConfirmToday = purpose === "check_in"
    ? stayToday >= (booking?.check_in || "") && stayToday < (booking?.check_out || "")
    : stayToday >= (booking?.check_out || "");
  const validAmount = /^[1-9]\d*$/.test(collectionAmount) &&
    BigInt(collectionAmount || 0) <= 9223372036854775807n;
  const difference = validAmount && booking ? BigInt(collectionAmount) - BigInt(booking.total_amount) : 0n;

  async function collectPayment() {
    setCollectionError("");
    try {
      await onCollect({ bookingId: booking.id, listingId: listing.id, method: collectionMethod,
        amount: collectionAmount });
      setCollectionAmount("");
    } catch (error) { setCollectionError(error?.message || t("stay.collectionFailed")); }
  }

  async function markNoShow() {
    setNoShowError("");
    try { await onNoShow(noShowReason.trim()); }
    catch (error) { setNoShowError(error?.message || t("stay.noShowFailed")); }
  }

  const bookingDetails = booking && <div className="rounded-control border border-line bg-muted-surface/40 p-4 text-sm">
    <p className="font-bold text-ink">{listing?.title} · {listing?.listing_code || t("trips.notProvided")}</p>
    <p className="mt-2 text-muted-ink">{t("stay.bookingCode")}: {booking.booking_code}</p>
    <p className="mt-1 text-muted-ink">{t("stay.guestName")}: {booking.guest_name || t("trips.notProvided")}</p>
    <p className="mt-1 text-muted-ink">{t("stay.guestPhone")}: {booking.guest_phone || t("trips.notProvided")}</p>
    <p className="mt-1 text-muted-ink">{t("stay.bookedAt")}: {booking.booked_at ? format(parseISO(booking.booked_at), "dd/MM/yyyy HH:mm") : t("trips.notProvided")}</p>
    <p className="mt-1 text-muted-ink">{format(parseISO(booking.check_in), "dd/MM/yyyy")} – {format(parseISO(booking.check_out), "dd/MM/yyyy")}</p>
    <p className="mt-2 font-semibold text-brand">{t(purpose === "check_in" ? "stay.checkIn" : "stay.checkOut")}</p>
    <p className="mt-1 font-semibold text-ink">{t(booking.payment_status === "paid" ? "stay.paymentPaid" : "stay.paymentUnpaid")}</p>
    <p className="mt-1 font-semibold text-ink">{t("stay.totalAmount")}: {money(booking.total_amount)}</p>
  </div>;

  return <section className="surface-panel space-y-4 p-4 sm:p-6" aria-live="polite">
    <h2 className="text-xl font-bold text-ink">{result ? t("stay.successTitle") : booking
      ? t(alreadyUsed ? "stay.alreadyUsedTitle" : "stay.previewTitle") : t(emptyTitle)}</h2>
    {result ? <><div className="rounded-control border border-positive/35 bg-positive/10 p-5 text-positive">
      <CheckCircle aria-hidden size={34} weight="fill" />
      <p className="mt-3 font-bold">{t(result.stay_status === "checked_in" ? "stay.checkInSuccess" : "stay.checkOutSuccess")}</p>
      <p className="mt-1 text-sm">{result.booking_code}</p>
      {resultAt && <p className="mt-1 text-sm">{t(result.stay_status === "checked_in" ? "stay.actualCheckIn" : "stay.actualCheckOut")}: {format(parseISO(resultAt), "dd/MM/yyyy HH:mm")}</p>}
    </div>{bookingDetails}</> : booking ? <>
      {bookingDetails}
      {purpose === "check_in" && booking.payment_method === "property" &&
        booking.payment_status !== "paid" && !alreadyUsed &&
        <div className="space-y-3 rounded-control border border-caution/40 bg-caution/10 p-4">
          <p className="text-sm font-semibold">{t("stay.collectBeforeCheckIn")}</p>
          <p className="text-sm text-ink">{t("stay.amountDue")}: <strong>{money(booking.total_amount)}</strong></p>
          <InputField label={t("stay.amountCollected")} type="text" inputMode="numeric" value={collectionAmount}
            onChange={(event) => setCollectionAmount(event.target.value.replace(/\D/g, ""))}
            hint={!validAmount || difference === 0n ? t("stay.amountHint") :
              t(difference < 0n ? "stay.amountBelowTotal" : "stay.amountAboveTotal", {
                amount: money(difference < 0n ? -difference : difference),
              })}
            placeholder={String(booking.total_amount)} />
          <select aria-label={t("stay.collectionMethod")} className="field-control" value={collectionMethod}
            onChange={(event) => setCollectionMethod(event.target.value)}>
            <option value="cash">{t("stay.cash")}</option><option value="bank_transfer">{t("stay.bankTransfer")}</option>
          </select>
          <p className="text-xs text-muted-ink">{t("stay.collectionCodeHint")}</p>
          <Button size="sm" onClick={collectPayment} loading={busy}
            disabled={locked || !validAmount}>{t("stay.recordCollection")}</Button>
          {collectionError && <p role="alert" className="text-sm text-danger">{collectionError}</p>}
        </div>}
      {alreadyUsed ? <p role="status" className="rounded-control border border-caution/40 bg-caution/10 p-4 text-sm font-semibold text-ink">
        {t(purpose === "check_in" ? "stay.alreadyUsedCheckIn" : "stay.alreadyUsedCheckOut", { time: format(parseISO(usedAt), "dd/MM/yyyy HH:mm") })}
      </p> : <Button onClick={onConfirm} loading={busy} className="w-full"
        disabled={locked || !canConfirmToday || (purpose === "check_in" && booking.payment_status !== "paid")}>
        <CheckCircle aria-hidden size={19} />{t(purpose === "check_in" ? "stay.manualCheckIn" : "stay.manualCheckOut")}</Button>}
      {purpose === "check_in" && !canConfirmToday && !alreadyUsed &&
        <p className="text-xs text-muted-ink">{t(stayToday < booking.check_in ? "stay.checkInStartsOn" : "stay.checkInEnded", {
          date: format(parseISO(booking.check_in), "dd/MM/yyyy"),
        })}</p>}
      {purpose === "check_out" && !canConfirmToday && !alreadyUsed &&
        <p className="text-xs text-muted-ink">{t("stay.checkOutStartsOn", {
          date: format(parseISO(booking.check_out), "dd/MM/yyyy"),
        })}</p>}
      {onNoShow && booking.payment_method === "property" && booking.payment_status !== "paid" &&
        <div className="space-y-3 rounded-control border border-line p-4">
          <InputField label={t("stay.noShowReason")} value={noShowReason}
            onChange={(event) => setNoShowReason(event.target.value)} />
          <Button size="sm" variant="secondary" onClick={markNoShow} loading={busy}
            disabled={locked || noShowReason.trim().length < 3}>{t("stay.markNoShow")}</Button>
          {noShowError && <p role="alert" className="text-sm text-danger">{noShowError}</p>}
        </div>}
      {actionError && <p role="alert" className="text-sm text-danger">{actionError}</p>}
    </> : <p className="text-sm leading-6 text-muted-ink">{t(emptyHint)}</p>}
  </section>;
}
