"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { addDays, format, parseISO } from "date-fns";
import { ImageSquare } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";
import DateField from "@/components/molecules/DateField";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatVND } from "@/lib/format";
import { chatApi } from "../api/chatApi";
import { formatProposalDate } from "../utils/formatProposalDate";

const today = () => new Date().toISOString().slice(0, 10);

/** Chủ nhà xem báo giá từ backend trước khi gửi; form không tự tính hoặc gửi giá lên server. */
export default function BookingProposalForm({ conversationId, proposal, initialListingId, onSaved, onClose }) {
  const { locale, t } = useLocale();
  const dialogRef = useRef(null);
  const keyRef = useRef(null);
  const preselectedIdRef = useRef(initialListingId);
  const [search, setSearch] = useState("");
  const [candidateResult, setCandidateResult] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [listingId, setListingId] = useState(proposal?.listing_id || "");
  const [selectedListing, setSelectedListing] = useState(proposal?.listing || null);
  const [checkIn, setCheckIn] = useState(proposal?.check_in || "");
  const [checkOut, setCheckOut] = useState(proposal?.check_out || "");
  const [guests, setGuests] = useState(proposal?.guests_count || 1);
  const [renterName, setRenterName] = useState(proposal?.renter_name || "");
  const [renterPhone, setRenterPhone] = useState(proposal?.renter_phone || "");
  const [requests, setRequests] = useState(proposal?.special_requests || "");
  const [stage, setStage] = useState(proposal ? "edit" : "select");
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [listingProblem, setListingProblem] = useState(false);
  const [quickSelectionFailed, setQuickSelectionFailed] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const key = `${conversationId}:${search.trim()}:${loadAttempt}`;
    const timer = window.setTimeout(() => {
      chatApi.proposalCandidates(conversationId, search.trim(), controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setCandidateResult({ key, ...data, error: false });
          if (preselectedIdRef.current) {
            const chosen = [...data.shared, ...data.other].find((listing) =>
              listing.id === preselectedIdRef.current && listing.status === "published");
            preselectedIdRef.current = null;
            if (chosen) {
              setListingId(chosen.id); setSelectedListing(chosen); setStage("edit");
            } else setQuickSelectionFailed(true);
          }
        })
        .catch(() => { if (!controller.signal.aborted) setCandidateResult({ key, error: true }); });
    }, search ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [conversationId, search, loadAttempt]);

  const selected = selectedListing;
  const candidateKey = `${conversationId}:${search.trim()}:${loadAttempt}`;
  const loading = candidateResult?.key !== candidateKey;
  const loadError = !loading && candidateResult.error;
  const candidates = loading || loadError ? { shared: [], other: [], hasMore: false } : candidateResult;
  const groups = [
    { key: "shared", title: t("chat.proposal.sharedListings"), items: candidates.shared },
    { key: "other", title: t("chat.proposal.otherListings"), items: candidates.other },
  ];
  const input = { listing_id: listingId, check_in: checkIn, check_out: checkOut,
    guests_count: Number(guests), renter_name: renterName.trim(),
    renter_phone: renterPhone.trim(), special_requests: requests.trim() };
  const invalidDates = !checkIn || !checkOut || checkIn < today() || checkOut <= checkIn;
  const invalidGuests = !Number.isInteger(Number(guests)) || Number(guests) < 1 ||
    (selected && Number(guests) > selected.max_guests);
  const invalidRenterName = input.renter_name.length < 2 || input.renter_name.length > 100;
  const invalidRenterPhone = !/^[0-9+ ]{8,15}$/.test(input.renter_phone);
  const describeError = (cause) => {
    if (cause?.message === "PROPOSAL_VERSION_CHANGED") return t("chat.proposal.changed");
    if (cause?.message === "Dates are not available") return t("chat.proposal.listingUnavailableForDates");
    if (cause?.message === "Invalid date range" || cause?.message === "Invalid date range or past check-in")
      return t("chat.proposal.invalidDates");
    if (cause?.message === "Invalid guests_count") return t("chat.proposal.invalidGuests");
    if (cause?.message === "Listing not owned") return t("chat.proposal.noAccess");
    if (cause?.message === "Listing not found") return t("chat.proposal.listingUnavailable");
    if (cause?.data?.errors?.renter_name) return t("chat.proposal.invalidRenterName");
    if (cause?.data?.errors?.renter_phone) return t("chat.proposal.invalidRenterPhone");
    return t("chat.proposal.saveFailed");
  };
  const chooseListing = (listing) => {
    if (listing.status !== "published") return;
    if (listing.id !== listingId) keyRef.current = null;
    setListingId(listing.id); setSelectedListing(listing); setQuote(null);
    setListingProblem(false); setQuickSelectionFailed(false); setError(null); setStage("edit");
  };
  const isListingProblem = (cause) => ["Dates are not available", "Listing not found",
    "Listing not owned"].includes(cause?.message);
  const review = async (event) => {
    event.preventDefault();
    if (!selected || invalidDates || invalidGuests || invalidRenterName || invalidRenterPhone) {
      setError(t(!selected ? "chat.proposal.chooseListing" :
        invalidDates ? "chat.proposal.invalidDates" : invalidGuests ? "chat.proposal.invalidGuests" :
          invalidRenterName ? "chat.proposal.invalidRenterName" : "chat.proposal.invalidRenterPhone"));
      return;
    }
    setBusy(true); setError(null); setListingProblem(false);
    try { setQuote(await chatApi.proposalQuote(conversationId, input)); setStage("review"); }
    catch (cause) { setError(describeError(cause)); setListingProblem(isListingProblem(cause)); }
    finally { setBusy(false); }
  };
  const send = async () => {
    if (busy || !quote) return;
    setBusy(true); setError(null);
    try {
      if (!keyRef.current) keyRef.current = crypto.randomUUID();
      const result = proposal
        ? await chatApi.updateProposal(conversationId, proposal.id,
          { ...input, version: proposal.version })
        : await chatApi.createProposal(conversationId,
          { ...input, client_key: keyRef.current });
      onSaved(result);
    } catch (cause) {
      setError(describeError(cause)); setListingProblem(isListingProblem(cause));
      if (isListingProblem(cause)) { setQuote(null); setStage("edit"); }
    }
    finally { setBusy(false); }
  };

  return <dialog ref={dialogRef} onCancel={(event) => { event.preventDefault(); onClose(); }}
    aria-labelledby="booking-proposal-title"
    className="w-[calc(100%-1rem)] max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/60 sm:w-[calc(100%-2rem)]">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
      <h2 id="booking-proposal-title" className="text-lg font-semibold">
        {t(stage === "select" ? "chat.proposal.chooseTitle" :
          proposal ? "chat.proposal.editTitle" : "chat.proposal.newTitle")}</h2>
      <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-muted-ink hover:bg-muted-surface focus-visible:ring-2 focus-visible:ring-brand">
        {t("common.close")}</button>
    </div>
    {stage === "select" ? <div className="space-y-5 p-5">
      <p className="text-sm text-muted-ink">{t("chat.proposal.chooseHelp")}</p>
      {quickSelectionFailed && <p role="status" className="text-sm text-danger">
        {t("chat.proposal.quickSelectionFailed")}</p>}
      <InputField type="search" label={t("chat.proposal.searchListing")} value={search} maxLength={80}
        onChange={(event) => setSearch(event.target.value)} />
      {loading ? <p role="status" className="text-sm text-muted-ink">{t("common.loading")}</p> :
        loadError ? <div role="alert" className="space-y-2 text-sm text-danger">
          <p>{t("chat.proposal.loadListingsFailed")}</p>
          <Button size="sm" variant="secondary" onClick={() => setLoadAttempt((value) => value + 1)}>
            {t("common.retry")}</Button></div> : <>
          {groups.map((group) => group.key === "shared" && !group.items.length ? null : <section key={group.key}>
            <h3 className="mb-2 text-sm font-semibold text-ink">{group.title}</h3>
            {group.items.length ? <ul className="space-y-2">{group.items.map((listing) => <li key={listing.id}>
              <button type="button" disabled={listing.status !== "published"}
                onClick={() => chooseListing(listing)} aria-pressed={listing.id === listingId}
                className="flex w-full items-center gap-3 rounded-xl border border-line p-2 text-left transition hover:border-brand hover:bg-muted-surface focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60">
                {listing.image_url ? <Image src={listing.image_url} alt="" unoptimized width={64} height={64}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover" /> :
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-muted-surface text-muted-ink"><ImageSquare aria-hidden size={25} /></span>}
                <span className="min-w-0"><strong className="block truncate text-sm text-ink">{listing.title}</strong>
                  <span className="block truncate text-xs text-muted-ink">{listing.location}</span>
                  <span className={`block text-xs ${listing.status === "published" ? "text-positive" : "text-danger"}`}>
                    {t(listing.status === "published" ? "chat.proposal.published" : "chat.proposal.unavailable")}</span>
                </span>
              </button></li>)}</ul> : <p className="text-sm text-muted-ink">
              {t(candidates.shared.length ? "chat.proposal.noOtherListings" : "chat.proposal.noListings")}</p>}
            {group.key === "other" && candidates.hasMore && <p className="mt-2 text-xs text-muted-ink">{t("chat.proposal.refineSearch")}</p>}
          </section>)}
        </>}
    </div> : stage === "edit" ? <form onSubmit={review} className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{t("chat.proposal.listing")}</span>
              <button type="button" onClick={() => { setStage("select"); setError(null); }}
                className="text-sm font-semibold text-brand underline focus-visible:ring-2 focus-visible:ring-brand">
                {t("chat.proposal.changeListing")}</button>
            </div>
            {selected && <div className="flex gap-3 rounded-xl border border-line bg-muted-surface p-2">
              {selected.image_url && <Image src={selected.image_url} alt="" unoptimized width={72} height={72}
                className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0"><p className="font-semibold">{selected.title}</p>
                <p className="text-xs text-muted-ink">{selected.location}</p>
                <p className="mt-1 text-xs text-muted-ink">{t("chat.proposal.guests")}: {selected.max_guests}</p>
              </div></div>}
            {!selected && <p role="alert" className="text-sm text-danger">{t("chat.proposal.chooseListing")}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField label={t("chat.proposal.checkIn")} selected={checkIn ? parseISO(checkIn) : null}
                minDate={parseISO(today())} withPortal portalId="booking-proposal-date-picker" onChange={(date) => {
                  const next = date ? format(date, "yyyy-MM-dd") : "";
                  setCheckIn(next);
                  if (!next || checkOut <= next) setCheckOut("");
                }} />
              <DateField label={t("chat.proposal.checkOut")} selected={checkOut ? parseISO(checkOut) : null}
                minDate={checkIn ? addDays(parseISO(checkIn), 1) : parseISO(today())}
                withPortal portalId="booking-proposal-date-picker" onChange={(date) => setCheckOut(date ? format(date, "yyyy-MM-dd") : "")} />
            </div>
            <InputField type="number" label={t("chat.proposal.guests")} value={guests}
              min={1} max={selected?.max_guests || 100} required
              onChange={(event) => setGuests(event.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField type="text" label={t("chat.proposal.renterName")} value={renterName}
                minLength={2} maxLength={100} required
                onChange={(event) => { keyRef.current = null; setRenterName(event.target.value); }} />
              <InputField type="tel" inputMode="tel" label={t("chat.proposal.renterPhone")}
                value={renterPhone} pattern="[0-9+ ]{8,15}" maxLength={15} required
                onChange={(event) => { keyRef.current = null; setRenterPhone(event.target.value); }} />
            </div>
            <div><label htmlFor="proposal-requests" className="mb-2 block text-sm font-semibold">{t("chat.proposal.requests")}</label>
              <textarea id="proposal-requests" value={requests} maxLength={500}
                onChange={(event) => setRequests(event.target.value)} className="field-control min-h-20 w-full resize-y" /></div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            {listingProblem && <button type="button" onClick={() => setStage("select")}
              className="text-sm font-semibold text-brand underline">{t("chat.proposal.changeListing")}</button>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
              <Button type="submit" loading={busy} disabled={!selected}>{t("chat.proposal.review")}</Button>
            </div>
          </form> : <div className="space-y-4 p-5">
            <div className="flex gap-3 rounded-xl border border-line bg-muted-surface p-3">
              {quote.listing.image_url && <Image src={quote.listing.image_url} alt="" unoptimized
                width={80} height={80} className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
              <div><p className="font-semibold">{quote.listing.title}</p>
                <p className="text-sm text-muted-ink">{quote.listing.location}</p></div>
            </div>
            <dl className="grid gap-3 rounded-xl border border-line p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-ink">{t("chat.proposal.checkIn")}</dt><dd className="font-semibold">{formatProposalDate(quote.check_in)}</dd></div>
              <div><dt className="text-muted-ink">{t("chat.proposal.checkOut")}</dt><dd className="font-semibold">{formatProposalDate(quote.check_out)}</dd></div>
              <div><dt className="text-muted-ink">{t("chat.proposal.guests")}</dt><dd className="font-semibold">{quote.guests_count}</dd></div>
              <div><dt className="text-muted-ink">{t("chat.proposal.renterName")}</dt><dd className="font-semibold break-words">{input.renter_name}</dd></div>
              <div><dt className="text-muted-ink">{t("chat.proposal.renterPhone")}</dt><dd className="font-semibold">{input.renter_phone}</dd></div>
              <div><dt className="text-muted-ink">{t("chat.proposal.nights", { count: quote.nights })}</dt>
                <dd>{formatVND(quote.price_per_night, locale === "en" ? "en-US" : "vi-VN")} / {t("chat.proposal.nights", { count: 1 })}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-ink">{t("chat.proposal.total")}</dt>
                <dd className="text-xl font-bold text-brand">{formatVND(quote.total_amount, locale === "en" ? "en-US" : "vi-VN")}</dd></div>
            </dl>
            {requests.trim() && <p className="whitespace-pre-wrap break-words text-sm">{requests.trim()}</p>}
            <p className="text-sm text-muted-ink">{t("chat.proposal.reviewHint")}</p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => { setStage("edit"); setError(null); }}>
                {t("chat.proposal.back")}</Button>
              <Button loading={busy} onClick={send}>{t(proposal ? "chat.proposal.save" : "chat.proposal.send")}</Button>
            </div>
          </div>}
    <div id="booking-proposal-date-picker" />
  </dialog>;
}
