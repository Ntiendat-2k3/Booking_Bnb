"use client";

import { useMemo } from "react";
import { addDays, eachDayOfInterval, format, isSameMonth } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatVND } from "@/lib/format";
import { dayEntries } from "../utils/calendar";

export const statusStyles = {
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

/** Dùng chung dữ liệu từng ngày cho ba chế độ xem, tránh lọc booking lại khi chỉ đổi ngày đang chọn. */
export default function HostCalendarDays({ calendar, range, anchor, view, selectedDate, today, onSelect }) {
  const { locale, t } = useLocale();
  const dateLocale = locale === "en" ? enUS : vi;
  const dayModels = useMemo(() => {
    const pricesByDate = new Map(calendar?.pricing?.days?.map((day) => [day.date, day]) || []);
    return eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) }).map((day) => {
      const date = format(day, "yyyy-MM-dd");
      return { day, date, ...dayEntries(date, calendar), price: pricesByDate.get(date) };
    });
  }, [calendar, range]);

  return (
    <div className="min-w-0 p-2 sm:p-4">
      {view !== "list" ? <>
        <div className="grid grid-cols-7 pb-2 text-center text-xs font-semibold text-muted-ink">
          {[0, 1, 2, 3, 4, 5, 6].map((index) =>
            <span key={index}>{t(`calendar.weekdays.${index}`)}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-control border border-line bg-line">
          {dayModels.map(({ day, date, status, bookings, blocks, price }) => {
            const label = bookings[0]?.renter_name || bookings[0]?.booking_code || blocks[0]?.reason || t(`calendar.${status}`);
            return <button key={date} type="button" onClick={() => onSelect(date)}
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
        {dayModels.map(({ day, date, status, bookings, blocks, price }) => {
          return <button key={date} type="button" onClick={() => onSelect(date)} aria-pressed={selectedDate === date}
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
  );
}
