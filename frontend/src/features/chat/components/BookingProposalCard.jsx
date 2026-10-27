"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/atoms/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatVND } from "@/lib/format";
import { chatApi } from "../api/chatApi";
import { formatProposalDate } from "../utils/formatProposalDate";

const statusKeys = {
  PENDING_CUSTOMER_CONFIRMATION: "pending",
  CUSTOMER_REQUESTED_CHANGES: "changes",
  REJECTED: "rejected",
  NEEDS_RECONFIRMATION: "reconfirm",
  BOOKING_CREATED: "created",
};
const reasonKeys = {
  PRICE_CHANGED: "stalePrice",
  UNAVAILABLE: "staleAvailability",
  LISTING_CHANGED: "staleListing",
};

/** Card đọc trạng thái proposal hiện tại từ backend; snapshot trong message chỉ dùng để hiện ngay khi tải. */
export default function BookingProposalCard({ message, userId, blocked, refreshKey,
  onMessageUpdate, onEdit }) {
  const { locale, t } = useLocale();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(null);
  const [note, setNote] = useState("");
  const [retry, setRetry] = useState(0);
  const proposalId = message.context?.proposal_id;

  useEffect(() => {
    if (!proposalId) return;
    let active = true;
    chatApi.proposalDetail(message.conversation_id, proposalId)
      .then((data) => { if (active) { setProposal(data); setError(null); } })
      .catch(() => { if (active) setError(t("chat.proposal.loadFailed")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [message.conversation_id, proposalId, message.revision, refreshKey, retry, t]);

  if (!proposalId) return null;
  const current = proposal || { ...message.context, listing: message.context.listing };
  const nights = current.check_in && current.check_out
    ? Math.round((Date.parse(`${current.check_out}T00:00:00Z`) -
      Date.parse(`${current.check_in}T00:00:00Z`)) / 86400000) : 0;
  const customer = proposal?.customer_id === userId;
  const host = proposal?.created_by === userId;
  const pending = proposal?.status === "PENDING_CUSTOMER_CONFIRMATION";
  const editable = host && ["PENDING_CUSTOMER_CONFIRMATION", "CUSTOMER_REQUESTED_CHANGES",
    "NEEDS_RECONFIRMATION"].includes(proposal.status);
  const statusKey = proposal?.booking_status === "confirmed" || proposal?.booking_status === "completed"
    ? "confirmed" : proposal?.booking_status === "cancelled" ? "cancelled" :
      proposal?.booking_status === "pending_payment" ? "awaitingPayment" :
      statusKeys[current.status] || "pending";
  const act = async (action) => {
    if (busy || !proposal) return;
    setBusy(true); setError(null);
    try {
      const result = await chatApi.proposalAction(message.conversation_id, proposal.id,
        action, { version: proposal.version, ...(action !== "confirm" ? { note: note.trim() } : {}) });
      setProposal(result.proposal);
      if (result.message) onMessageUpdate(result.message);
      setStep(null); setNote("");
    } catch (cause) {
      setError(cause.message === "PROPOSAL_VERSION_CHANGED" ?
        t("chat.proposal.changed") : t("chat.proposal.saveFailed"));
      setRetry((value) => value + 1);
    } finally { setBusy(false); }
  };

  return <article className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-soft">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-muted-surface/70 px-4 py-2 text-xs">
      <strong className="font-semibold text-brand">{t("chat.proposal.title")}</strong>
      <span className="flex flex-wrap items-center gap-2"><span className="text-muted-ink">
        {t("chat.proposal.version", { count: current.version })}</span>
        <span className="rounded-full border border-line bg-surface px-2 py-1 font-semibold">
          {t(`chat.proposal.${statusKey}`)}</span></span>
    </div>
    <div className="space-y-3 p-3 sm:p-4">
      <Link href={`/rooms/${encodeURIComponent(current.listing?.id || current.listing_id || "")}`}
        className="flex min-w-0 gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand">
        {current.listing?.image_url && <Image src={current.listing.image_url} alt="" unoptimized
          width={88} height={80} className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
        <span className="min-w-0"><strong className="block break-words text-sm">{current.listing?.title}</strong>
          <span className="block text-xs text-muted-ink">{current.listing?.location}</span>
          <span className="mt-1 block text-xs font-semibold text-brand underline">
            {t("chat.proposal.viewRoomDetails")}</span></span>
      </Link>
      <dl className="grid grid-cols-2 gap-3 border-y border-line py-3 text-xs sm:text-sm">
        <div><dt className="text-muted-ink">{t("chat.proposal.checkIn")}</dt>
          <dd className="font-semibold">{formatProposalDate(current.check_in)}</dd></div>
        <div><dt className="text-muted-ink">{t("chat.proposal.checkOut")}</dt>
          <dd className="font-semibold">{formatProposalDate(current.check_out)}</dd></div>
        <div><dt className="text-muted-ink">{t("chat.proposal.guests")}</dt>
          <dd className="font-semibold">{current.guests_count}</dd></div>
        {current.renter_name && <div><dt className="text-muted-ink">{t("chat.proposal.renterName")}</dt>
          <dd className="break-words font-semibold">{current.renter_name}</dd></div>}
        {current.renter_phone && <div><dt className="text-muted-ink">{t("chat.proposal.renterPhone")}</dt>
          <dd className="font-semibold">{current.renter_phone}</dd></div>}
        <div><dt className="text-muted-ink">{t("chat.proposal.duration")}</dt>
          <dd className="font-semibold">{t("chat.proposal.nights", { count: nights })}</dd></div>
      </dl>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="text-xs text-muted-ink">{t("chat.proposal.total")}</p>
          <p className="text-xl font-bold text-brand">{formatVND(current.total_amount, locale === "en" ? "en-US" : "vi-VN")}</p></div>
        <p className="text-xs text-muted-ink">{formatVND(current.price_per_night, locale === "en" ? "en-US" : "vi-VN")} / {t("chat.proposal.nights", { count: 1 })}</p>
      </div>
      {proposal?.special_requests && <p className="whitespace-pre-wrap break-words text-xs text-muted-ink">{proposal.special_requests}</p>}
      {proposal?.change_request && <p className="rounded-lg bg-muted-surface p-2 text-xs">{proposal.change_request}</p>}
      {proposal?.failure_reason && <p role="status" className="text-sm text-danger">
        {t(`chat.proposal.${reasonKeys[proposal.failure_reason] || "staleListing"}`)}</p>}
      {pending && <p className="text-xs text-muted-ink">{t("chat.proposal.notReserved")}</p>}
      <p className="text-[11px] text-muted-ink">{message.sender_name || t("chat.you")} · {new Date(message.created_at).toLocaleString("en-GB")}</p>
      {loading && <p role="status" className="text-sm text-muted-ink">{t("common.loading")}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error} <button type="button"
        onClick={() => setRetry((value) => value + 1)} className="font-semibold underline">{t("common.retry")}</button></p>}
      {customer && pending && !blocked && !loading && <div className="space-y-2">
        {!step && <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={busy} onClick={() => void act("confirm")}>{t("chat.proposal.confirm")}</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStep("request-changes")}>{t("chat.proposal.requestChanges")}</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStep("reject")}>{t("chat.proposal.reject")}</Button>
        </div>}
        {step && <div className="space-y-2 rounded-xl border border-line p-3">
          <label htmlFor={`proposal-note-${proposalId}`} className="block text-sm font-semibold">
            {t(step === "reject" ? "chat.proposal.rejectConfirm" : "chat.proposal.changeNote")}</label>
          {step === "request-changes" && <textarea id={`proposal-note-${proposalId}`}
            value={note} maxLength={500} onChange={(event) => setNote(event.target.value)}
            className="field-control min-h-20 w-full resize-y" />}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={step === "reject" ? "danger" : "primary"}
              loading={busy} disabled={step === "request-changes" && !note.trim()}
              onClick={() => void act(step)}>{t(step === "reject" ? "chat.proposal.reject" : "chat.proposal.requestChanges")}</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setStep(null); setNote(""); }}>
              {t("common.cancel")}</Button>
          </div>
        </div>}
      </div>}
      {host && pending && <p className="text-sm text-muted-ink">{t("chat.proposal.waiting")}</p>}
      {editable && !blocked && <Button size="sm" variant="secondary" onClick={() => onEdit(proposal)}>
        {t("chat.proposal.edit")}</Button>}
      {proposal?.booking_id && customer && <Button size="sm" variant="secondary"
        href={proposal.booking_status === "pending_payment" ? `/checkout/${proposal.booking_id}` : "/trips"}>
        {t(proposal.booking_status === "pending_payment" ? "chat.proposal.pay" : "chat.proposal.viewBooking")}</Button>}
    </div>
  </article>;
}
