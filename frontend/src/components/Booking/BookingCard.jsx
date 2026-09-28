"use client";

import { useMemo, useState } from "react";
import { CalendarDots, ShieldCheck, Users } from "@phosphor-icons/react";
import { createBooking } from "@/services/bookingService";
import { formatVND } from "@/lib/format";
import { notifyError, notifyInfo } from "@/lib/notify";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, differenceInDays } from "date-fns";
import { enUS, vi } from "date-fns/locale";

export default function BookingSidebar({ listing }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const n = differenceInDays(endDate, startDate);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [startDate, endDate]);

  const total = useMemo(() => {
    const p = Number(listing.price_per_night);
    if (!nights || !Number.isFinite(p)) return 0;
    return p * nights;
  }, [listing.price_per_night, nights]);

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
      });

      const bookingId = booking?.id;
      if (!bookingId) throw new Error(t("booking.failed"));

      router.push(`/checkout/${bookingId}`);
    } catch (e) {
      notifyError(e?.message || t("booking.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="h-fit rounded-2xl border border-line bg-surface p-5 shadow-soft lg:sticky lg:top-32">
      <div className="flex items-end justify-between">
        <div className="text-xl font-bold text-ink">
          {formatVND(
            listing.price_per_night,
            locale === "en" ? "en-US" : "vi-VN",
          )}{" "}
          <span className="text-sm font-normal text-muted-ink">
            {t("booking.perNight")}
          </span>
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-1">
          <div className="border-b border-line p-3">
            <label id="booking-dates-label" htmlFor="booking-dates" className="mb-1 flex items-center gap-1.5 text-xs font-bold text-ink">
              <CalendarDots aria-hidden size={16} />
              {t("booking.dates")}
            </label>
            <DatePicker
              id="booking-dates"
              ariaLabelledBy="booking-dates-label"
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              minDate={new Date()}
              placeholderText={t("booking.chooseDates")}
              className="z-50 min-h-11 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink focus:ring-4 focus:ring-ink/10"
              calendarClassName="shadow-lg border-slate-200 rounded-2xl"
              monthsShown={1}
              locale={locale === "en" ? enUS : vi}
            />
          </div>

          <div className="p-3">
            <label
              htmlFor="booking-guests"
              className="flex items-center gap-1.5 text-xs font-bold text-ink"
            >
              <Users aria-hidden size={16} />
              {t("booking.guests")}
            </label>
            <input
              id="booking-guests"
              type="number"
              min={1}
              max={listing.max_guests}
              className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink focus:ring-4 focus:ring-ink/10"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
            <div className="mt-1 text-xs text-muted-ink">
              {t("booking.maxGuests", { count: listing.max_guests })}
            </div>
          </div>
        </div>
      </div>

      {nights > 0 && (
        <div className="mt-4 rounded-xl bg-muted-surface p-4 text-sm text-ink">
          <div className="flex items-center justify-between">
            <span>
              {t("booking.nightsPrice", {
                price: formatVND(
                  listing.price_per_night,
                  locale === "en" ? "en-US" : "vi-VN",
                ),
                count: nights,
              })}
            </span>
            <span className="font-medium">
              {formatVND(total, locale === "en" ? "en-US" : "vi-VN")}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold">{t("booking.total")}</span>
            <span className="font-bold">
              {formatVND(total, locale === "en" ? "en-US" : "vi-VN")}
            </span>
          </div>
        </div>
      )}
      <Button
        className="mt-4 w-full"
        size="lg"
        onClick={onReserve}
        loading={loading}
        disabled={!isInitialized}
      >
        {loading ? t("booking.processing") : t("booking.reserve")}
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
