"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDots, ShieldCheck, Users } from "@phosphor-icons/react";
import { createBooking } from "@/services/bookingService";
import { formatVND } from "@/lib/format";
import { notifyError, notifyInfo } from "@/lib/notify";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import DateField from "@/components/molecules/DateField";
import { addDays, format, differenceInDays, parseISO, isValid, startOfDay } from "date-fns";

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
              placeholderText={t("booking.chooseDates")}
            />
          </div>

          <div className="booking-checkin hidden p-3">
            <DateField variant="integrated" id="booking-check-in" label={t("checkout.checkIn")} selected={startDate} minDate={new Date()} dateFormat="dd/MM" title={startDate ? format(startDate, "dd/MM/yyyy") : undefined}
              placeholderText={t("search.datesPlaceholder")} onChange={(date) => setDateRange([date, date && endDate > date ? endDate : null])} />
          </div>
          <div className="booking-checkout hidden p-3">
            <DateField variant="integrated" id="booking-check-out" label={t("checkout.checkOut")} selected={endDate} disabled={!startDate} dateFormat="dd/MM" title={endDate ? format(endDate, "dd/MM/yyyy") : undefined}
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
