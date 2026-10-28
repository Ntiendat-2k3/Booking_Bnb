"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowClockwise, CalendarBlank } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { notifySuccess } from "@/lib/notify";
import { canManageListings, isAdminRole } from "@/lib/roles";
import { useChatSocket } from "@/features/chat/hooks/useChatSocket";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import SearchableSelect from "@/components/molecules/SearchableSelect";
import StayReviewCard from "@/features/hostStays/StayReviewCard";
import StayQrScanner from "@/features/hostStays/StayQrScanner";

const stayDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
});

export default function HostStaysPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const user = useSelector((state) => state.auth.user);
  const isInitialized = useSelector((state) => state.auth.isInitialized);
  const canManage = canManageListings(user?.role);
  const [listings, setListings] = useState([]);
  const [listingId, setListingId] = useState("");
  const [listingError, setListingError] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsAttempt, setListingsAttempt] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [bookingsError, setBookingsError] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [scanError, setScanError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [preview, setPreview] = useState(null);
  const [scannedToken, setScannedToken] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [reportError, setReportError] = useState("");
  const [collections, setCollections] = useState([]);
  const [collectionTotals, setCollectionTotals] = useState(null);
  const [collectionPage, setCollectionPage] = useState(1);
  const [collectionPages, setCollectionPages] = useState(1);
  const [scanResult, setScanResult] = useState(null);
  const [lookupResult, setLookupResult] = useState(null);
  const [stayToday, setStayToday] = useState(() => stayDateFormatter.format(new Date()));
  const busy = Boolean(busyAction);
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId);
  const manualPurpose = selectedBooking?.stay_status === "checked_in" ? "check_out" : "check_in";

  useEffect(() => {
    const timer = setInterval(() => setStayToday(stayDateFormatter.format(new Date())), 30000);
    return () => clearInterval(timer);
  }, []);

  useChatSocket(user?.id, (event, connected) => {
    if (event === "booking:status" || (event === "connection" && connected))
      setRevision((value) => value + 1);
  });

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) { router.replace("/login"); return; }
    if (!canManage) { router.replace("/host"); return; }
    let active = true;
    apiFetch("/api/v1/host/listings").then((response) => {
      if (!active) return;
      const items = response.data?.items || [];
      const requested = new URLSearchParams(window.location.search).get("listing_id");
      setListings(items);
      setListingId(items.find((item) => item.id === requested)?.id || "");
      setListingError(false);
    }).catch(() => { if (active) setListingError(true); })
      .finally(() => { if (active) setListingsLoading(false); });
    return () => { active = false; };
  }, [canManage, isInitialized, router, user, listingsAttempt]);

  useEffect(() => {
    if (listingsLoading || listingError) return;
    let active = true;
    async function loadBookings() {
      const params = listingId ? { listing_id: listingId } : {};
      const first = await apiFetch("/api/v1/host/stays", { params: { ...params, page: 1 } });
      const pages = first.data?.meta?.total_pages || 1;
      const items = [...(first.data?.items || [])];
      for (let page = 2; page <= pages; page++) {
        const response = await apiFetch("/api/v1/host/stays", { params: { ...params, page } });
        items.push(...(response.data?.items || []));
      }
      if (active) { setBookings(items); setBookingsError(false); }
    }
    loadBookings()
      .catch(() => { if (active) setBookingsError(true); })
      .finally(() => { if (active) setBookingsLoading(false); });
    return () => { active = false; };
  }, [listingId, listingsLoading, listingError, revision]);

  useEffect(() => {
    if (!listingId) return;
    let active = true;
    apiFetch("/api/v1/host/collections", { params: { listing_id: listingId, page: collectionPage } })
      .then((response) => { if (active) { setCollections(response.data?.items || []);
        setCollectionTotals(response.data?.totals || null);
        setCollectionPages(response.data?.meta?.total_pages || 1); } })
      .catch(() => { if (active) { setCollections([]); setCollectionTotals(null); } });
    return () => { active = false; };
  }, [listingId, collectionPage, revision]);

  /** Ghi kết quả check-in/check-out từ máy chủ và đồng bộ booking trong danh sách tra cứu nếu cùng mã. */
  function showScanSuccess(confirmed, inspected) {
    setScanResult(confirmed);
    setPreview({ ...inspected, already_used: true,
      used_at: confirmed.stay_status === "checked_in" ? confirmed.actual_check_in_at : confirmed.actual_check_out_at,
      booking: { ...inspected.booking, stay_status: confirmed.stay_status,
        actual_check_in_at: confirmed.actual_check_in_at,
        actual_check_out_at: confirmed.actual_check_out_at } });
    setScannedToken("");
    setBookings((current) => current.map((booking) => booking.id === confirmed.id
      ? { ...booking, stay_status: confirmed.stay_status,
        actual_check_in_at: confirmed.actual_check_in_at,
        actual_check_out_at: confirmed.actual_check_out_at } : booking));
    setRevision((value) => value + 1);
  }

  async function inspect(token) {
    setBusyAction("scan");
    setScanError("");
    setScanResult(null);
    try {
      const response = await apiFetch("/api/v1/host/stays/inspect", {
        method: "POST", body: { token },
      });
      const inspected = response.data;
      setPreview(inspected);
      setScannedToken(inspected.already_used ? "" : token);
      const today = stayDateFormatter.format(new Date());
      if (!inspected.already_used && inspected.purpose === "check_in" &&
        inspected.booking.payment_status === "paid" &&
        today >= inspected.booking.check_in && today < inspected.booking.check_out) {
        try {
          const confirmed = await apiFetch("/api/v1/host/stays/confirm", {
            method: "POST", body: { token },
          });
          showScanSuccess(confirmed.data, inspected);
        } catch (error) {
          if (error?.status === 410) {
            const fresh = await apiFetch("/api/v1/host/stays/inspect", {
              method: "POST", body: { token },
            });
            setPreview(fresh.data);
            setScannedToken(fresh.data.already_used ? "" : token);
          } else setScanError(t("stay.confirmFailed"));
        }
      }
    } catch (error) {
      setPreview(null);
      setScannedToken("");
      setScanError(t(error?.status === 410 ? "stay.invalidQr" :
        error?.status === 409 ? "stay.wrongRoom" : "stay.scanFailed"));
    } finally { setBusyAction(""); }
  }

  async function confirmScan() {
    if (!preview || preview.already_used || !scannedToken || busy) return;
    setBusyAction("scan");
    setScanError("");
    try {
      const response = await apiFetch("/api/v1/host/stays/confirm", {
        method: "POST", body: { token: scannedToken },
      });
      showScanSuccess(response.data, preview);
    } catch (error) {
      if (error?.status === 410) await inspect(scannedToken);
      else setScanError(t("stay.confirmFailed"));
    } finally { setBusyAction(""); }
  }

  async function confirmManual() {
    if (!selectedBooking || !selectedBooking.listing || busy) return;
    setBusyAction("lookup");
    setLookupError("");
    try {
      const response = await apiFetch(`/api/v1/host/stays/${selectedBooking.id}/manual`, {
        method: "POST", body: { listing_id: selectedBooking.listing.id, purpose: manualPurpose,
          reason: t("stay.manualSelectionReason") },
      });
      setLookupResult(response.data);
      setSelectedBookingId("");
      if (preview?.booking.id === response.data.id) {
        setPreview(null);
        setScannedToken("");
      }
      setRevision((value) => value + 1);
    } catch (error) {
      setLookupError(t(error?.status === 409 ? "stay.statusConflict" : "stay.confirmFailed"));
    } finally { setBusyAction(""); }
  }

  async function collectPayment({ bookingId, listingId: targetListingId, method, amount }, source) {
    if (!bookingId || !targetListingId || busy) return;
    setBusyAction(source);
    try {
      const response = await apiFetch(`/api/v1/host/stays/${bookingId}/collect-payment`, { method: "POST",
        body: { listing_id: targetListingId, method, amount } });
      notifySuccess(t("stay.collectionRecorded", { code: response.data.collection.external_ref }));
      setPreview((current) => current?.booking.id === bookingId ? { ...current,
        booking: { ...current.booking, payment_status: "paid" } } : current);
      setBookings((current) => current.map((item) => item.id === bookingId
        ? { ...item, payment_status: "paid" } : item));
      setRevision((value) => value + 1);
    } finally { setBusyAction(""); }
  }

  async function markNoShow(reason) {
    if (!selectedBooking?.listing || reason.length < 3 || busy) return;
    setBusyAction("lookup"); setLookupError("");
    try {
      await apiFetch(`/api/v1/host/stays/${selectedBooking.id}/no-show`, { method: "POST",
        body: { listing_id: selectedBooking.listing.id, reason } });
      if (preview?.booking.id === selectedBooking.id) {
        setPreview(null);
        setScannedToken("");
      }
      setSelectedBookingId("");
      setRevision((value) => value + 1);
    } finally { setBusyAction(""); }
  }

  async function reconcileCollection(collectionId) {
    if (!isAdminRole(user?.role) || busy) return;
    setBusyAction("report"); setReportError("");
    try {
      await apiFetch(`/api/v1/host/collections/${collectionId}/reconcile`, { method: "POST", body: {} });
      setRevision((value) => value + 1);
    } catch (error) { setReportError(error?.message || t("stay.collectionFailed")); }
    finally { setBusyAction(""); }
  }

  if (!isInitialized || !user || !canManage) return null;
  return <div className="space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="page-heading">{t("stay.hostTitle")}</h1><p className="mt-1 text-sm text-muted-ink">{t("stay.hostDescription")}</p></div>
      <Button href="/host/calendar" variant="secondary" size="sm"><CalendarBlank aria-hidden size={18} />{t("calendar.title")}</Button>
    </header>

    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.9fr)]">
        <StayQrScanner busy={busy} error={scanError} onScan={inspect}
          onStart={() => { setScanError(""); setPreview(null); setScanResult(null); }} />

        <StayReviewCard key={preview?.booking ? `${preview.booking.id}:${preview.booking.payment_status}:${preview.expires_at || preview.used_at}` : "scan-empty"}
          booking={preview?.booking} listing={preview?.listing} purpose={preview?.purpose}
          result={scanResult} alreadyUsed={preview?.already_used} usedAt={preview?.used_at}
          stayToday={stayToday} busy={busyAction === "scan"} locked={busy}
          emptyTitle="stay.nextStepTitle" emptyHint="stay.scanToPreview"
          onConfirm={confirmScan} onCollect={(payload) => collectPayment(payload, "scan")} />
    </div>

    {listingError ? <div role="alert" className="surface-panel p-5 text-danger">{t("calendar.loadFailed")}
      <Button variant="secondary" size="sm" className="ml-3" onClick={() => { setListingError(false); setListingsLoading(true); setListingsAttempt((value) => value + 1); }}>{t("common.retry")}</Button>
    </div> : listingsLoading ? <p role="status" className="surface-panel p-5 text-muted-ink">{t("common.loading")}</p> :
      listings.length === 0 ? <p className="surface-panel p-5 text-muted-ink">{t("calendar.noListings")}</p> : <>
      <section className="surface-panel space-y-4 p-4 sm:p-6">
        <div><h2 className="text-lg font-bold text-ink">{t("stay.lookupTitle")}</h2><p className="mt-1 text-sm text-muted-ink">{t("stay.lookupHint")}</p></div>
        <div className="flex flex-wrap items-end gap-3">
          <SearchableSelect options={[{ value: "", label: t("stay.allListings") },
            ...listings.map((listing) => ({ value: listing.id, label: listing.title }))]}
            value={listingId} label={t("calendar.listing")} searchLabel={t("calendar.searchListing")}
            emptyLabel={t("calendar.noMatchingListings")}
            onChange={(id) => {
              setListingId(id); setSelectedBookingId(""); setLookupResult(null);
              setBookings([]); setBookingsLoading(true); setLookupError(""); setReportError("");
              setCollections([]); setCollectionTotals(null); setCollectionPage(1);
              if (id === listingId) setRevision((value) => value + 1);
            }} />
          <Button variant="ghost" size="sm" onClick={() => setRevision((value) => value + 1)}><ArrowClockwise aria-hidden size={18} />{t("calendar.refresh")}</Button>
        </div>
        {bookingsLoading ? <p role="status" className="text-sm text-muted-ink">{t("common.loading")}</p> :
          bookingsError ? <p role="alert" className="text-sm text-danger">{t("stay.listFailed")}</p> :
          bookings.length === 0 ? <p className="text-sm text-muted-ink">{t("stay.noBookings")}</p> :
            <SearchableSelect options={bookings.map((booking) => ({ value: booking.id,
              label: `${booking.booking_code} · ${booking.guest_name || t("trips.notProvided")} · ${booking.listing?.title || ""} · ${format(parseISO(booking.check_in), "dd/MM/yyyy")}` }))}
              value={selectedBookingId} label={t("stay.chooseBooking")}
              searchLabel={t("stay.searchBooking")} emptyLabel={t("stay.noMatchingBookings")}
              placeholder={t("stay.chooseBooking")}
              onChange={(id) => {
                setSelectedBookingId(id); setLookupResult(null); setLookupError("");
              }} />}
      </section>
      <StayReviewCard key={selectedBooking ? `${selectedBooking.id}:${selectedBooking.payment_status}` : "lookup-empty"}
        booking={selectedBooking} listing={selectedBooking?.listing} purpose={manualPurpose}
        result={lookupResult} stayToday={stayToday} busy={busyAction === "lookup"} locked={busy}
        emptyTitle="stay.lookupResultTitle" emptyHint="stay.selectBookingToPreview"
        onConfirm={confirmManual} onCollect={(payload) => collectPayment(payload, "lookup")} onNoShow={markNoShow}
        actionError={lookupError} />
      {listingId && <section className="surface-panel space-y-3 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-ink">{t("stay.collectionsTitle")}</h2>
        {collectionTotals && <div className="grid gap-2 text-sm sm:grid-cols-3">
          <p>{t("stay.outstanding")}: <strong>{formatVND(collectionTotals.outstanding, locale === "en" ? "en-US" : "vi-VN")}</strong></p>
          <p>{t("stay.collected")}: <strong>{formatVND(collectionTotals.collected, locale === "en" ? "en-US" : "vi-VN")}</strong></p>
          <p>{t("stay.awaitingReconciliation")}: <strong>{formatVND(collectionTotals.awaiting_reconciliation, locale === "en" ? "en-US" : "vi-VN")}</strong></p>
        </div>}
        <p className="text-xs text-muted-ink">{t("stay.reportPageHint")}</p>
        {collections.length === 0 ? <p className="text-sm text-muted-ink">{t("stay.noCollections")}</p> :
          <div className="grid gap-2 text-sm">{collections.map((item) => <div key={item.booking_id}
            className="flex flex-wrap justify-between gap-2 rounded-control border border-line p-3">
            <span>{item.booking_code} · {format(parseISO(item.check_in), "dd/MM/yyyy")}</span>
            <span>{formatVND(item.collection?.amount || item.amount, locale === "en" ? "en-US" : "vi-VN")} · {item.collection
              ? t(item.collection.reconciled_at ? "stay.reconciled" : "stay.awaitingReconciliation")
              : t("stay.paymentUnpaid")}</span>
            {item.collection && String(item.collection.amount) !== String(item.amount) &&
              <span className="w-full text-xs text-caution">{t("stay.totalAmount")}: {formatVND(item.amount, locale === "en" ? "en-US" : "vi-VN")}</span>}
            {item.collection && <span className="w-full text-xs text-muted-ink">
              {t(item.collection.method === "cash" ? "stay.cash" : "stay.bankTransfer")}
              {" · "}{t("stay.collectionReference")}: {item.collection.external_ref}
              {" · "}{t("stay.collectedBy")}: {item.collection.collected_by}
              {" · "}{format(parseISO(item.collection.collected_at), "dd/MM/yyyy HH:mm")}
            </span>}
            {item.collection && !item.collection.reconciled_at && isAdminRole(user?.role) &&
              <Button size="sm" variant="secondary" onClick={() => reconcileCollection(item.collection.id)}
                loading={busyAction === "report"} disabled={busy}>{t("stay.reconcile")}</Button>}
          </div>)}</div>}
        {reportError && <p role="alert" className="text-sm text-danger">{reportError}</p>}
        {collectionPages > 1 && <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" disabled={collectionPage <= 1}
            onClick={() => setCollectionPage((page) => page - 1)}>{t("stay.previousPage")}</Button>
          <span className="text-sm">{collectionPage} / {collectionPages}</span>
          <Button size="sm" variant="secondary" disabled={collectionPage >= collectionPages}
            onClick={() => setCollectionPage((page) => page + 1)}>{t("stay.nextPage")}</Button>
        </div>}
      </section>}
    </>}
  </div>;
}
