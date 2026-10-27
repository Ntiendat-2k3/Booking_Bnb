"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDots, ShieldCheck, Users } from "@phosphor-icons/react";
import { createBooking, getListingAvailability, getListingQuote } from "@/services/bookingService";
import { formatVND } from "@/lib/format";
import { notifyError, notifyInfo } from "@/lib/notify";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import DateField from "@/components/molecules/DateField";
import PriceBreakdown from "@/components/Booking/PriceBreakdown";
import { addDays, addMonths, format, differenceInDays, parseISO, isValid, startOfDay } from "date-fns";

export default function BookingSidebar({ listing, initialCheckIn, initialCheckOut }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [dateRange, setDateRange] = useState(() => {
    // Tham số URL chỉ gợi ý ngày đặt; ngày không hợp lệ hoặc đã qua không được dùng.
    const date = typeof initialCheckIn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(initialCheckIn) ? parseISO(initialCheckIn) : null;
    const start = date && isValid(date) && date >= startOfDay(new Date()) ? date : null;
    const end = typeof initialCheckOut === "string" && /^\d{4}-\d{2}-\d{2}$/.test(initialCheckOut) ? parseISO(initialCheckOut) : null;
    return [start, start && end && isValid(end) && end > start ? end : null];
  });
  const [startDate, endDate] = dateRange;

  const [availabilityWindow] = useState(() => ({
    start: format(new Date(), "yyyy-MM-dd"),
    end: format(addMonths(new Date(), 18), "yyyy-MM-dd"),
  }));
  const [unavailable, setUnavailable] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getListingAvailability(listing.id, availabilityWindow.start, availabilityWindow.end)
      .then((intervals) => { if (active) { setUnavailable(intervals); setAvailabilityError(false); } })
      .catch(() => { if (active) setAvailabilityError(true); })
      .finally(() => { if (active) setAvailabilityLoading(false); });
    return () => { active = false; };
  }, [listing.id, availabilityWindow, availabilityAttempt]);

  const occupied = (day) => unavailable.some((item) => item.start_date <= day && day < item.end_date);
  const rangeUnavailable = startDate && endDate && unavailable.some((item) =>
    item.start_date <= format(endDate, "yyyy-MM-dd") && item.end_date > format(startDate, "yyyy-MM-dd"));
  const selectableDate = (date) => {
    const day = format(date, "yyyy-MM-dd");
    if (startDate && !endDate && day > format(startDate, "yyyy-MM-dd"))
      return !unavailable.some((item) => item.start_date <= day && item.end_date > format(startDate, "yyyy-MM-dd"));
    return !occupied(day);
  };

  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const n = differenceInDays(endDate, startDate);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [startDate, endDate]);

  const quoteKey = nights ? `${format(startDate, "yyyy-MM-dd")}:${format(endDate, "yyyy-MM-dd")}` : "";
  const [quoteState, setQuoteState] = useState({ key: "", quote: null, error: null });
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const quoteRequestKey = `${quoteKey}:${quoteAttempt}`;
  const quote = quoteState.key === quoteRequestKey ? quoteState.quote : null;
  const quoteError = quoteState.key === quoteRequestKey ? quoteState.error : null;

  useEffect(() => {
    if (!quoteKey) return;
    const controller = new AbortController();
    let active = true;
    getListingQuote(listing.id, format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd"), controller.signal)
      .then((result) => { if (active) setQuoteState({ key: quoteRequestKey, quote: result, error: null }); })
      .catch((error) => { if (active) setQuoteState({ key: quoteRequestKey, quote: null, error }); });
    return () => { active = false; controller.abort(); };
  }, [listing.id, quoteKey, quoteRequestKey, startDate, endDate]);

  async function onReserve() {
    if (!isInitialized || loading) return;
    if (!user) {
      notifyInfo(t("booking.loginRequired"));
      return;
    }
    if (!startDate || !endDate) {
      notifyError(t("booking.datesRequired"));
      return;
    }

    if (!nights) {
      notifyError(t("booking.invalidDates"));
      return;
    }
    if (availabilityLoading || availabilityError || rangeUnavailable) {
      notifyError(t("booking.datesUnavailable"));
      return;
    }
    if (!quote) {
      notifyError(quoteError?.message === "STAY_LENGTH_RESTRICTED"
        ? t("pricing.stayRestricted") : quoteError?.message || t("pricing.quoteUnavailable"));
      return;
    }
    const g = Number(guests);
    if (!Number.isInteger(g) || g <= 0) {
      notifyError(t("booking.invalidGuests"));
      return;
    }
    if (g > Number(listing.max_guests)) {
      notifyError(t("booking.maxGuests", { count: listing.max_guests }));
      return;
    }

    setLoading(true);
    try {
      const booking = await createBooking({
        listing_id: listing.id,
        check_in: format(startDate, "yyyy-MM-dd"),
        check_out: format(endDate, "yyyy-MM-dd"),
        guests_count: g,
        expected_total: quote.total,
      });

      const bookingId = booking?.id;
      if (!bookingId) throw new Error(t("booking.failed"));

      router.push(`/checkout/${bookingId}`);
    } catch (e) {
      notifyError(e?.message === "PRICE_CHANGED" ? t("pricing.priceChanged") :
        e?.status === 409 ? t("booking.datesUnavailable") : e?.message || t("booking.failed"));
      if (e?.status === 409) {
        setAvailabilityLoading(true);
        setAvailabilityAttempt((current) => current + 1);
        setQuoteAttempt((current) => current + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="booking-card surface-panel h-fit p-6 lg:sticky lg:top-36">
      <div className="booking-rate flex items-end justify-between">
        <div className="text-2xl font-bold tracking-tight text-ink">
          {formatVND(
            listing.price_per_night,
            locale === "en" ? "en-US" : "vi-VN",
          )}{" "}
          <span className="text-sm font-normal text-muted-ink">
            {t("booking.perNight")}
          </span>
        </div>
      </div>
      <div className="booking-fields mt-6 rounded-control border border-line bg-muted-surface/40">
        <div className="booking-fields-grid grid grid-cols-1">
          <div className="booking-date-range border-b border-line p-3">
            <DateField
              label={<span className="flex items-center gap-1.5">
                <CalendarDots aria-hidden size={16} />
                {t("booking.dates")}
              </span>}
              id="booking-dates"
              className="[&>label]:text-xs [&>label]:font-bold"
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              minDate={new Date()}
              maxDate={addDays(parseISO(availabilityWindow.end), -1)}
              filterDate={selectableDate}
              dayClassName={(date) => occupied(format(date, "yyyy-MM-dd")) ? "!bg-danger/20 !text-danger" : ""}
              placeholderText={t("booking.chooseDates")}
            />
            {availabilityLoading ? <p className="mt-2 text-xs text-muted-ink">{t("booking.loadingAvailability")}</p> :
              availabilityError ? <button type="button" className="mt-2 text-xs font-semibold text-danger underline" onClick={() => { setAvailabilityLoading(true); setAvailabilityAttempt((current) => current + 1); }}>{t("booking.availabilityRetry")}</button> :
                <p className={`mt-2 text-xs ${rangeUnavailable ? "text-danger" : "text-muted-ink"}`}>
                  {t(rangeUnavailable ? "booking.datesUnavailable" : "booking.unavailableDatesHint")}
                </p>}
          </div>

          <div className="booking-checkin hidden p-3">
            <DateField variant="integrated" id="booking-check-in" label={t("checkout.checkIn")} selected={startDate} minDate={new Date()} dateFormat="dd/MM/yyyy" title={startDate ? format(startDate, "dd/MM/yyyy") : undefined}
              placeholderText={t("search.datesPlaceholder")} onChange={(date) => setDateRange([date, date && endDate > date ? endDate : null])} />
          </div>
          <div className="booking-checkout hidden p-3">
            <DateField variant="integrated" id="booking-check-out" label={t("checkout.checkOut")} selected={endDate} disabled={!startDate} dateFormat="dd/MM/yyyy" title={endDate ? format(endDate, "dd/MM/yyyy") : undefined}
              minDate={startDate ? addDays(startDate, 1) : new Date()} placeholderText={t("search.datesPlaceholder")} onChange={(date) => setDateRange([startDate, date])} />
          </div>

          <div className="booking-guests p-3">
            <InputField
              label={<span className="flex items-center gap-2"><Users aria-hidden size={16} />{t("booking.guests")}</span>}
              id="booking-guests"
              type="number"
              min={1}
              max={listing.max_guests}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              hint={t("booking.maxGuests", { count: listing.max_guests })}
            />
          </div>
        </div>
      </div>

      {nights > 0 && (
        <div className="booking-breakdown mt-4 rounded-xl bg-muted-surface p-4 text-sm text-ink">
          {quote ? <PriceBreakdown quote={quote} /> :
            <p role={quoteError ? "alert" : "status"} className={quoteError ? "text-danger" : "text-muted-ink"}>
              {quoteError?.message === "STAY_LENGTH_RESTRICTED"
                ? t("pricing.stayRestricted") : quoteError?.message || t("pricing.loadingQuote")}
            </p>}
        </div>
      )}
      <Button
        className="mt-4 w-full"
        size="lg"
        onClick={onReserve}
        loading={loading}
        disabled={!isInitialized || availabilityLoading || availabilityError || !!rangeUnavailable || (nights > 0 && !quote)}
      >
        {loading ? t("booking.processing") : t("booking.reserve")}
        <ArrowRight aria-hidden size={20} />
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-ink">
        <ShieldCheck aria-hidden size={16} />
        {t("booking.secureNote")}
      </p>
      {isInitialized && !user && (
        <p className="mt-3 text-xs leading-5 text-muted-ink">
          {t("booking.loginPrefix")}{" "}
          <Link className="font-semibold text-ink underline" href="/login">
            {t("navigation.login")}
          </Link>{" "}
          {t("booking.loginSuffix")}
        </p>
      )}
    </aside>
  );
}
