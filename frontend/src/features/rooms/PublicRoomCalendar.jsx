"use client";

import { useEffect, useState } from "react";
import { addDays, addMonths, differenceInCalendarMonths, eachDayOfInterval, endOfMonth,
  endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { ArrowClockwise, CaretLeft, CaretRight } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import { getListingCalendar } from "@/services/bookingService";

const weekdaysVi = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Hiển thị lịch khách theo trạng thái có thể đặt; dữ liệu cá nhân và lý do khóa không đi qua API công khai. */
export default function PublicRoomCalendar({ listingId }) {
  const { locale, t } = useLocale();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const monthStart = startOfMonth(month);
  const startDate = format(monthStart, "yyyy-MM-dd");
  const endDate = format(addMonths(monthStart, 1), "yyyy-MM-dd");
  const requestKey = `${listingId}:${startDate}:${endDate}`;
  const current = calendar?.key === requestKey ? calendar : null;
  const today = format(new Date(), "yyyy-MM-dd");
  const bookingHorizon = format(addMonths(new Date(), 18), "yyyy-MM-dd");
  const monthOffset = differenceInCalendarMonths(monthStart, startOfMonth(new Date()));
  const dateLocale = locale === "en" ? enUS : vi;
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  });

  useEffect(() => {
    let active = true;
    getListingCalendar(listingId, startDate, endDate)
      .then((data) => {
        if (active) { setCalendar({ ...data, key: requestKey }); setError(false); }
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listingId, startDate, endDate, requestKey, attempt]);

  if (!calendar?.show_public_calendar) return null;

  return <section id="availability" className="scroll-mt-32 border-b border-line pb-8" aria-label={t("room.publicCalendarTitle")}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">{t("room.publicCalendarTitle")}</h2>
        <p className="mt-2 text-sm text-muted-ink">{t("room.publicCalendarDescription")}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => { setError(false); setMonth((value) => addMonths(value, -1)); }}
          disabled={monthOffset <= 0} aria-label={t("calendar.previous")} className="!min-h-10 !px-2">
          <CaretLeft aria-hidden size={18} />
        </Button>
        <span className="min-w-32 text-center text-sm font-bold text-ink">{format(month, "LLLL yyyy", { locale: dateLocale })}</span>
        <Button size="sm" variant="secondary" onClick={() => { setError(false); setMonth((value) => addMonths(value, 1)); }}
          disabled={monthOffset >= 17} aria-label={t("calendar.next")} className="!min-h-10 !px-2">
          <CaretRight aria-hidden size={18} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}
          aria-label={t("calendar.refresh")} className="!min-h-10 !px-2">
          <ArrowClockwise aria-hidden size={18} />
        </Button>
      </div>
    </div>

    <div className="mt-5 rounded-panel border border-line bg-surface p-3 sm:p-5">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-ink">
        {weekdaysVi.map((label, index) => <span key={label} className="py-2">
          {locale === "en" ? format(addDays(new Date(2024, 0, 1), index), "EEE", { locale: enUS }) : label}
        </span>)}
      </div>
      {error ? <div className="flex flex-wrap items-center gap-3 py-5 text-sm text-danger" role="alert">
        {t("room.publicCalendarFailed")}
        <Button size="sm" variant="secondary" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>
          {t("common.retry")}
        </Button>
      </div> : !current ? <p role="status" className="py-8 text-center text-sm text-muted-ink">
        {t("room.publicCalendarLoading")}
      </p> : <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-busy={loading}>
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, monthStart);
          if (!inMonth) return <span key={dayKey} aria-hidden className="min-h-11" />;
          const status = dayKey < today ? "past" : dayKey >= bookingHorizon ? "notOpen" :
            current?.intervals?.some((item) => item.start_date <= dayKey && dayKey < item.end_date)
              ? "unavailable" : "available";
          const label = t(status === "past" ? "room.publicCalendarPast" :
            status === "notOpen" ? "room.publicCalendarNotOpen" :
              status === "unavailable" ? "room.publicCalendarUnavailable" : "room.publicCalendarAvailable");
          return <div key={dayKey} className={`grid min-h-11 place-items-center rounded-control border text-sm font-semibold sm:min-h-12 ${
            status === "unavailable" ? "border-danger/30 bg-danger/10 text-danger" :
              status === "available" ? "border-positive/30 bg-positive/10 text-ink" :
                "border-line bg-muted-surface/40 text-muted-ink"
          }`}>
            <time dateTime={dayKey}>
              <span aria-hidden>{format(day, "d")}</span>
              <span className="sr-only">{format(day, "dd/MM/yyyy")}: {label}</span>
            </time>
          </div>;
        })}
      </div>}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-ink">
        <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-positive" aria-hidden />{t("room.publicCalendarAvailable")}</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-full bg-danger" aria-hidden />{t("room.publicCalendarUnavailable")}</span>
      </div>
      <p className="mt-3 text-xs text-muted-ink">{t("room.publicCalendarHint")}</p>
    </div>
  </section>;
}
