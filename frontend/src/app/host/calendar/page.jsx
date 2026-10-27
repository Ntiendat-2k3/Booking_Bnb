"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { ArrowClockwise, CalendarBlank, CaretLeft, CaretRight, Eye, EyeSlash, LockKey, LockKeyOpen, X } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { canManageListings } from "@/lib/roles";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";
import DateField from "@/components/molecules/DateField";
import SearchableSelect from "@/components/molecules/SearchableSelect";
import CalendarPricingEditor from "@/features/hostListings/components/CalendarPricingEditor";

const VIEWS = ["month", "week", "list"];
const VI_WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const statusStyles = {
  available: "border-positive/35 bg-positive/10 text-positive",
  booked: "border-sky-500/45 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  held: "border-danger/45 bg-danger/15 text-danger",
  blocked: "border-caution/50 bg-caution/15 text-caution",
};
const statusDots = {
  available: "bg-positive",
  booked: "bg-sky-500",
  held: "bg-danger",
  blocked: "bg-caution",
};

function visibleRange(anchor, view) {
  if (view === "month") {
    return {
      start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
      end: addDays(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 1),
    };
  }
  const start = view === "week" ? startOfWeek(anchor, { weekStartsOn: 1 }) : startOfMonth(anchor);
  return { start, end: view === "week" ? addDays(start, 7) : addDays(endOfMonth(anchor), 1) };
}

/** Lịch giữ cả ngày trả phòng khi chưa có giờ nhận/trả phòng cụ thể. */
function dayEntries(date, calendar) {
  const bookings = calendar?.bookings?.filter((item) => item.check_in <= date && date <= item.check_out) || [];
  const blocks = calendar?.blocks?.filter((item) => item.start_date <= date && date < item.end_date) || [];
  const status = bookings.some((item) => item.status !== "pending_payment") ? "booked" :
    bookings.length ? "held" : blocks.length ? "blocked" : "available";
  return { bookings, blocks, status };
}

export default function HostCalendarPage() {
  const dateDialogRef = useRef(null);
  const detailsRef = useRef(null);
  const router = useRouter();
  const { locale, t } = useLocale();
  const user = useSelector((state) => state.auth.user);
  const isInitialized = useSelector((state) => state.auth.isInitialized);
  const canManage = canManageListings(user?.role);
  const [listings, setListings] = useState([]);
  const [listingId, setListingId] = useState("");
  const [listingError, setListingError] = useState(false);
  const [listingAttempt, setListingAttempt] = useState(0);
  const [calendar, setCalendar] = useState(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [calendarErrorKey, setCalendarErrorKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [view, setView] = useState("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [reason, setReason] = useState("");
  const [dialogAction, setDialogAction] = useState("block");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [visibilityError, setVisibilityError] = useState("");
  const [revision, setRevision] = useState(0);

  const range = useMemo(() => visibleRange(anchor, view), [anchor, view]);
  const rangeStart = format(range.start, "yyyy-MM-dd");
  const rangeEnd = format(range.end, "yyyy-MM-dd");
  const requestKey = `${listingId}:${rangeStart}:${rangeEnd}`;
  const days = useMemo(() => eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) }), [range]);
  const selected = dayEntries(selectedDate, calendar);
  const pricesByDate = new Map(calendar?.pricing?.days?.map((day) => [day.date, day]) || []);
  const selectedListing = listings.find((item) => item.id === listingId);
  const today = format(new Date(), "yyyy-MM-dd");
  const dateLocale = locale === "en" ? enUS : vi;

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) { router.replace("/login"); return; }
    if (!canManage) { router.replace("/host"); return; }
    let active = true;
    apiFetch("/api/v1/host/listings")
      .then((response) => {
        if (!active) return;
        const items = response.data?.items || [];
        const requested = new URLSearchParams(window.location.search).get("listing_id");
        setListings(items);
        setListingId(items.find((item) => item.id === requested)?.id || items[0]?.id || "");
        setListingError(false);
      })
      .catch(() => { if (active) setListingError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canManage, isInitialized, router, user, listingAttempt]);

  useEffect(() => {
    if (!listingId) return;
    let active = true;
    apiFetch("/api/v1/host/calendar", {
      params: { listing_id: listingId, start_date: rangeStart, end_date: rangeEnd },
    }).then((response) => {
      if (active) { setCalendar(response.data); setLoadedKey(requestKey); setCalendarErrorKey(""); }
    }).catch(() => {
      if (active) setCalendarErrorKey(requestKey);
    });
    return () => { active = false; };
  }, [listingId, rangeStart, rangeEnd, requestKey, revision]);

  useEffect(() => {
    if (!listingId) return;
    const timer = setInterval(() => setRevision((current) => current + 1), 45000);
    return () => clearInterval(timer);
  }, [listingId]);

  function move(direction) {
    const next = view === "month" || view === "list" ? addMonths(anchor, direction) : addDays(anchor, direction * 7);
    setAnchor(next);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  }

  function selectDay(date) {
    setSelectedDate(date);
    if (window.matchMedia("(max-width: 1279px)").matches)
      requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openDateDialog(action, date) {
    const firstDate = date || (action === "block" && selectedDate < today ? today : selectedDate);
    setDialogAction(action);
    setStartDate(firstDate);
    setLastDate(firstDate);
    setReason("");
    setMessage("");
    setFeedback("");
    dateDialogRef.current?.showModal();
  }

  async function changeBlock(action) {
    setMessage("");
    if (!startDate || !lastDate || lastDate < startDate || (action === "block" && startDate < today)) {
      setMessage(t("calendar.invalidRange"));
      return;
    }
    setBusy(true);
    try {
      const endDate = format(addDays(parseISO(lastDate), 1), "yyyy-MM-dd");
      const response = await apiFetch("/api/v1/host/calendar/blocks", {
        method: action === "block" ? "POST" : "DELETE",
        body: { listing_id: listingId, start_date: startDate, end_date: endDate,
          ...(action === "block" ? { reason } : {}) },
      });
      setFeedback(t(action === "block" ? "calendar.blockedSuccess" :
        response.data?.changed ? "calendar.unblockedSuccess" : "calendar.nothingToUnblock"));
      setRevision((current) => current + 1);
      dateDialogRef.current?.close();
    } catch (error) {
      setMessage(error?.status === 409 ? t("calendar.conflict") : t("calendar.saveFailed"));
    } finally { setBusy(false); }
  }

  async function togglePublicCalendar() {
    if (!selectedListing || visibilityBusy) return;
    const visible = !selectedListing.show_public_calendar;
    setVisibilityBusy(true);
    setFeedback("");
    setVisibilityError("");
    try {
      const response = await apiFetch("/api/v1/host/calendar/visibility", {
        method: "PATCH", body: { listing_id: listingId, visible },
      });
      setListings((current) => current.map((item) => item.id === listingId
        ? { ...item, show_public_calendar: response.data.show_public_calendar } : item));
      setFeedback(t(visible ? "calendar.publishedSuccess" : "calendar.hiddenSuccess"));
    } catch (error) {
      setVisibilityError(t(error?.status === 409 ? "calendar.publishRequiresListing" : "calendar.visibilityFailed"));
    } finally { setVisibilityBusy(false); }
  }

  if (!isInitialized || !user || !canManage) return null;

  return <div className="space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="page-heading">{t("calendar.title")}</h1>
        <p className="mt-1 text-sm text-muted-ink">{t("calendar.description")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button href="/host/stays" size="sm">{t("stay.hostTitle")}</Button>
        <Button href="/host/listings" variant="secondary" size="sm">{t("calendar.manageListings")}</Button>
      </div>
    </header>

    {listingError ? <div role="alert" className="surface-panel flex flex-wrap items-center gap-3 p-5 text-danger">{t("calendar.loadFailed")}
      <Button variant="secondary" size="sm" onClick={() => { setLoading(true); setListingAttempt((current) => current + 1); }}>{t("common.retry")}</Button>
    </div> :
      !loading && listings.length === 0 ? <div className="surface-panel p-5 text-muted-ink">{t("calendar.noListings")}</div> : null}

    {listingId && <>
      <section className="surface-panel" aria-label={t("calendar.title")}>
        <div className="relative z-20 flex flex-wrap items-end justify-between gap-4 border-b border-line p-4 sm:p-5">
          <SearchableSelect options={listings.map((item) => ({ value: item.id, label: item.title }))}
            value={listingId} label={t("calendar.listing")} searchLabel={t("calendar.searchListing")}
            emptyLabel={t("calendar.noMatchingListings")}
            onChange={(id) => { setListingId(id); setMessage(""); setFeedback(""); setVisibilityError(""); }} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={togglePublicCalendar}
              loading={visibilityBusy} disabled={!selectedListing?.show_public_calendar && selectedListing?.status !== "published"}
              aria-pressed={Boolean(selectedListing?.show_public_calendar)}>
              {selectedListing?.show_public_calendar ? <EyeSlash aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
              {t(selectedListing?.show_public_calendar ? "calendar.hidePublic" : "calendar.publish")}
            </Button>
            <Button size="sm" onClick={() => openDateDialog("block")}><LockKey aria-hidden size={18} />{t("calendar.block")}</Button>
            <Button size="sm" variant="secondary" onClick={() => openDateDialog("unblock")}><LockKeyOpen aria-hidden size={18} />{t("calendar.unblock")}</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={() => move(-1)} aria-label={t("calendar.previous")} className="!min-h-10 !px-2"><CaretLeft aria-hidden size={18} /></Button>
            <Button variant="secondary" size="sm" onClick={() => move(1)} aria-label={t("calendar.next")} className="!min-h-10 !px-2"><CaretRight aria-hidden size={18} /></Button>
            <h2 className="ml-2 min-w-0 text-base font-bold text-ink sm:text-lg">{format(anchor, "LLLL yyyy", { locale: dateLocale })}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => { setAnchor(new Date()); setSelectedDate(today); }} className="!min-h-10">{t("calendar.today")}</Button>
            <Button variant="ghost" size="sm" onClick={() => setRevision((current) => current + 1)} aria-label={t("calendar.refresh")} className="!min-h-10 !px-2"><ArrowClockwise aria-hidden size={18} /></Button>
            <div className="flex rounded-control border border-line p-0.5" role="group" aria-label={t("calendar.viewLabel")}>
              {VIEWS.map((item) => <button key={item} type="button" onClick={() => setView(item)} aria-pressed={view === item}
                className={`min-h-9 rounded-lg px-2.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${view === item ? "bg-brand text-on-brand" : "text-muted-ink hover:bg-muted-surface"}`}>
                {t(`calendar.${item}`)}
              </button>)}
            </div>
          </div>
        </div>

        {selectedListing?.status !== "published" &&
          <p className="border-b border-line px-4 py-2 text-xs text-caution sm:px-5">{t("calendar.notPublished")}</p>}
        {selectedListing?.show_public_calendar && selectedListing?.status === "published" &&
          <p className="border-b border-line px-4 py-2 text-xs text-positive sm:px-5">{t("calendar.publicHint")}</p>}
        {visibilityError && <p role="alert" className="border-b border-line px-4 py-2 text-sm text-danger sm:px-5">{visibilityError}</p>}
        {feedback && <p role="status" className="border-b border-line px-4 py-2 text-sm text-positive sm:px-5">{feedback}</p>}

        {calendarErrorKey === requestKey ? <div role="alert" className="p-5 text-danger">{t("calendar.loadFailed")} <Button variant="secondary" size="sm" onClick={() => setRevision((current) => current + 1)}>{t("common.retry")}</Button></div> :
          loadedKey !== requestKey ? <div role="status" className="p-8 text-muted-ink">{t("common.loading")}</div> :
          <div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 p-2 sm:p-4">
              {view !== "list" ? <>
                <div className="grid grid-cols-7 pb-2 text-center text-xs font-semibold text-muted-ink">
                  {VI_WEEKDAYS.map((label, index) => <span key={label}>
                    {locale === "en" ? format(addDays(new Date(2024, 0, 1), index), "EEE", { locale: dateLocale }) : label}
                  </span>)}
                </div>
                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-control border border-line bg-line">
                  {days.map((day) => {
                    const date = format(day, "yyyy-MM-dd");
                    const { status, bookings, blocks } = dayEntries(date, calendar);
                    const price = pricesByDate.get(date);
                    const label = bookings[0]?.renter_name || bookings[0]?.booking_code || blocks[0]?.reason || t(`calendar.${status}`);
                    return <button key={date} type="button" onClick={() => selectDay(date)}
                      aria-label={`${format(day, "dd/MM/yyyy")}: ${t(`calendar.${status}`)}${bookings[0]?.renter_name ? `, ${bookings[0].renter_name}` : ""}`}
                      aria-pressed={selectedDate === date}
                      className={`flex min-h-16 min-w-0 flex-col items-center gap-1 bg-surface p-1 text-left transition hover:bg-muted-surface focus-visible:z-10 sm:min-h-24 sm:items-stretch sm:p-2 ${view === "month" && !isSameMonth(day, anchor) ? "opacity-45" : ""} ${selectedDate === date ? "relative z-[1] ring-2 ring-inset ring-brand" : ""}`}>
                      <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold sm:size-8 sm:text-sm ${date === today ? "bg-brand text-on-brand" : "text-ink"}`}>{format(day, "d")}</span>
                      <span aria-hidden className={`size-2 rounded-full sm:hidden ${statusDots[status]}`} />
                      {price && <span className="hidden w-full truncate text-xs font-semibold text-ink sm:block">{formatVND(price.price_per_night, locale === "en" ? "en-US" : "vi-VN")}</span>}
                      {status !== "available" && <span className={`hidden w-full truncate rounded-md border px-1.5 py-1 text-xs font-semibold sm:block ${statusStyles[status]}`}>{label}</span>}
                    </button>;
                  })}
                </div>
              </> : <div className="divide-y divide-line">
                {days.map((day) => {
                  const date = format(day, "yyyy-MM-dd");
                  const { status, bookings, blocks } = dayEntries(date, calendar);
                  const price = pricesByDate.get(date);
                  return <button key={date} type="button" onClick={() => selectDay(date)} aria-pressed={selectedDate === date}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${selectedDate === date ? "bg-muted-surface" : "hover:bg-muted-surface/50"}`}>
                    <span className="min-w-0 text-sm font-medium text-ink">{format(day, "EEE, dd/MM/yyyy", { locale: dateLocale })}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      {price && <span className="hidden text-xs font-semibold text-ink sm:block">{formatVND(price.price_per_night, locale === "en" ? "en-US" : "vi-VN")}</span>}
                      {(bookings[0]?.renter_name || blocks[0]?.reason) && <span className="hidden max-w-48 truncate text-xs text-muted-ink sm:block">{bookings[0]?.renter_name || blocks[0]?.reason}</span>}
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-xs ${statusStyles[status]}`}>{t(`calendar.${status}`)}</span>
                    </span>
                  </button>;
                })}
              </div>}
              <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 pt-4 text-xs">
                {Object.keys(statusStyles).map((status) => <span key={status} className="flex items-center gap-1.5 text-muted-ink">
                  <span aria-hidden className={`size-2.5 rounded-full ${statusDots[status]}`} />{t(`calendar.${status}`)}
                </span>)}
              </div>
            </div>

            <aside ref={detailsRef} className="scroll-mt-24 space-y-4 border-t border-line bg-muted-surface/20 p-4 sm:p-5 xl:border-l xl:border-t-0" aria-label={t("calendar.dayDetails")}>
              <div className="flex items-center gap-2"><CalendarBlank aria-hidden size={20} className="text-brand" /><h3 className="font-bold text-ink">{format(parseISO(selectedDate), "dd/MM/yyyy")}</h3></div>
              <p className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[selected.status]}`}>{t(`calendar.${selected.status}`)}</p>
              {selected.bookings.map((booking) => <div key={booking.id} className="rounded-control border border-line bg-surface p-3 text-sm">
                <p className="font-semibold text-ink">{booking.booking_code || booking.id}</p>
                {booking.renter_name && <p className="mt-1 font-medium text-ink">{booking.renter_name}</p>}
                <p className="mt-1 text-muted-ink">{format(parseISO(booking.check_in), "dd/MM/yyyy")} – {format(parseISO(booking.check_out), "dd/MM/yyyy")}</p>
                <p className="mt-1 text-muted-ink">{t("calendar.guests", { count: booking.guests_count })} · {t(booking.status === "pending_payment" ? "calendar.held" : "calendar.booked")}</p>
                {booking.hold_expires_at && <p className="mt-1 text-xs text-muted-ink">{t("calendar.holdUntil", { time: new Date(booking.hold_expires_at).toLocaleTimeString(locale === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" }) })}</p>}
              </div>)}
              {selected.blocks.map((block) => <p key={block.id} className="rounded-control border border-caution/30 bg-caution/10 p-3 text-sm text-caution">{block.reason || t("calendar.hostBlocked")}</p>)}
              {selected.status === "available" && <p className="text-sm text-muted-ink">{t("calendar.noActivity")}</p>}
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Button size="sm" onClick={() => openDateDialog("block", selectedDate)} disabled={selected.status !== "available" || selectedDate < today}><LockKey aria-hidden size={18} />{t("calendar.block")}</Button>
                {selected.blocks.length > 0 && <Button size="sm" variant="secondary" onClick={() => openDateDialog("unblock", selectedDate)}><LockKeyOpen aria-hidden size={18} />{t("calendar.unblock")}</Button>}
              </div>
            </aside>
          </div>}
        {loadedKey === requestKey && calendar?.pricing &&
          <CalendarPricingEditor key={listingId} listingId={listingId} selectedDate={selectedDate}
            pricing={calendar.pricing} onSaved={() => setRevision((current) => current + 1)} />}
      </section>

      <dialog ref={dateDialogRef} aria-labelledby="calendar-dialog-title" onClose={() => setMessage("")}
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-panel border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-black/70">
        <form method="dialog" className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="calendar-dialog-title" className="text-lg font-bold">{t(dialogAction === "block" ? "calendar.block" : "calendar.unblock")}</h2>
          <button type="submit" aria-label={t("common.close")} className="grid size-10 place-items-center rounded-full text-muted-ink hover:bg-muted-surface"><X aria-hidden size={20} /></button>
        </form>
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-ink">{t("calendar.rangeHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DateField label={t("calendar.firstDate")} selected={startDate ? parseISO(startDate) : null}
              minDate={dialogAction === "block" ? parseISO(today) : undefined}
              withPortal portalId="host-calendar-date-picker" onChange={(date) => {
              const next = date ? format(date, "yyyy-MM-dd") : "";
              setStartDate(next);
              if (lastDate < next) setLastDate(next);
            }} />
            <DateField label={t("calendar.lastDate")} selected={lastDate ? parseISO(lastDate) : null}
              minDate={startDate ? parseISO(startDate) : dialogAction === "block" ? parseISO(today) : undefined}
              withPortal portalId="host-calendar-date-picker" onChange={(date) => setLastDate(date ? format(date, "yyyy-MM-dd") : "")} />
          </div>
          {dialogAction === "block" && <InputField label={t("calendar.reason")} value={reason} maxLength={255} onChange={(event) => setReason(event.target.value)} />}
          {message && <p role="alert" className="text-sm text-danger">{message}</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" size="sm" onClick={() => dateDialogRef.current?.close()}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={() => changeBlock(dialogAction)} disabled={busy || !startDate || !lastDate} loading={busy}>{t(dialogAction === "block" ? "calendar.block" : "calendar.unblock")}</Button>
          </div>
        </div>
        <div id="host-calendar-date-picker" />
      </dialog>
    </>}
  </div>;
}
