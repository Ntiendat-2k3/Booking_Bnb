"use client";

import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";
import DateField from "@/components/molecules/DateField";

const weekendDays = [[5, "friday"], [6, "saturday"], [0, "sunday"]];
const emptyRange = { start: "", end: "", kind: "range", name: "", price: "", min: "", max: "" };

/** Chỉnh giá từ lịch Host; các thay đổi được lưu qua API có kiểm tra quyền sở hữu. */
export default function CalendarPricingEditor({ listingId, selectedDate, pricing, onSaved }) {
  const { locale, t } = useLocale();
  const [weekendDraft, setWeekendDraft] = useState(null);
  const [dayDraft, setDayDraft] = useState(null);
  const [range, setRange] = useState(emptyRange);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const money = (value) => formatVND(value, locale === "en" ? "en-US" : "vi-VN");
  const weekdayRules = pricing?.rules?.filter((rule) => rule.kind === "weekday") || [];
  const weekend = weekendDraft || Object.fromEntries(weekendDays.map(([weekday, key]) =>
    [key, weekdayRules.find((rule) => Number(rule.weekday) === weekday)?.price_per_night || ""]));
  const savedDay = pricing?.daily_prices?.find((item) => item.date === selectedDate);
  const dayPrice = dayDraft?.date === selectedDate ? dayDraft.price : savedDay?.price_per_night || "";
  const effective = pricing?.days?.find((item) => item.date === selectedDate);
  const rangeRules = pricing?.rules?.filter((rule) => rule.kind !== "weekday") || [];

  async function save(path, method, body, afterSave) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch(path, { method, body });
      afterSave?.();
      setSuccess(t("pricing.saved"));
      onSaved();
    } catch (cause) {
      setError(cause?.message || t("pricing.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 border-t border-line p-4 sm:p-5" aria-label={t("pricing.manageTitle")}>
      <div>
        <h2 className="text-lg font-bold text-ink">{t("pricing.manageTitle")}</h2>
        <p className="mt-1 text-sm text-muted-ink">{t("pricing.basePrice")}: {money(pricing?.base_price || 0)}</p>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {success && <p role="status" className="text-sm text-positive">{success}</p>}

      <div className="grid gap-4 rounded-control border border-line p-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h3 className="mb-3 font-semibold text-ink">{t("pricing.weekendTitle")}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {weekendDays.map(([, key]) => <InputField key={key} label={t(`pricing.${key}`)} type="number"
              min="1" max={Number.MAX_SAFE_INTEGER} placeholder={pricing?.base_price || ""}
              value={weekend[key]} onChange={(event) => setWeekendDraft({ ...weekend, [key]: event.target.value })} />)}
          </div>
        </div>
        <Button size="sm" disabled={busy} onClick={() => save("/api/v1/host/calendar/pricing/weekdays", "PUT", {
          listing_id: listingId, ...Object.fromEntries(weekendDays.map(([, key]) =>
            [key, weekend[key] === "" ? null : Number(weekend[key])])),
        }, () => setWeekendDraft(null))}>{t("common.save")}</Button>
      </div>

      <div className="grid gap-4 rounded-control border border-line p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h3 className="mb-1 font-semibold text-ink">{t("pricing.dayTitle", { date: selectedDate })}</h3>
          <p className="mb-3 text-sm text-muted-ink">{t("pricing.effectivePrice")}: {money(effective?.price_per_night || pricing?.base_price || 0)}</p>
          <InputField label={t("pricing.dayPrice")} type="number" min="1"
            max={Number.MAX_SAFE_INTEGER} placeholder={t("pricing.useRules")}
            value={dayPrice} onChange={(event) => setDayDraft({ date: selectedDate, price: event.target.value })} />
        </div>
        <Button size="sm" disabled={busy || selectedDate < today} onClick={() => save("/api/v1/host/calendar/pricing/day", "PUT", {
          listing_id: listingId, date: selectedDate, price_per_night: dayPrice === "" ? null : Number(dayPrice),
        }, () => setDayDraft(null))}>{t("common.save")}</Button>
      </div>

      <div className="space-y-4 rounded-control border border-line p-4">
        <h3 className="font-semibold text-ink">{t("pricing.rangeTitle")}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DateField label={t("calendar.firstDate")} selected={range.start ? parseISO(range.start) : null}
            minDate={parseISO(today)} onChange={(date) => setRange((current) => ({ ...current,
              start: date ? format(date, "yyyy-MM-dd") : "" }))} />
          <DateField label={t("calendar.lastDate")} selected={range.end ? parseISO(range.end) : null}
            minDate={range.start ? parseISO(range.start) : parseISO(today)}
            onChange={(date) => setRange((current) => ({ ...current,
              end: date ? format(date, "yyyy-MM-dd") : "" }))} />
          <label className="grid gap-1 text-sm font-semibold text-ink">{t("pricing.ruleType")}
            <select className="field-control" value={range.kind}
              onChange={(event) => setRange((current) => ({ ...current, kind: event.target.value }))}>
              {["range", "season", "holiday"].map((kind) =>
                <option key={kind} value={kind}>{t(`pricing.${kind}`)}</option>)}
            </select>
          </label>
          <InputField label={t("pricing.ruleName")} value={range.name}
            maxLength={120} onChange={(event) => setRange((current) => ({ ...current, name: event.target.value }))} />
          <InputField label={t("pricing.rangePrice")} type="number" min="1" value={range.price}
            onChange={(event) => setRange((current) => ({ ...current, price: event.target.value }))} />
          <InputField label={t("pricing.minNights")} type="number" min="1" max="365" value={range.min}
            onChange={(event) => setRange((current) => ({ ...current, min: event.target.value }))} />
          <InputField label={t("pricing.maxNights")} type="number" min="1" max="365" value={range.max}
            onChange={(event) => setRange((current) => ({ ...current, max: event.target.value }))} />
        </div>
        <Button size="sm" disabled={busy || !range.start || !range.end || range.end < range.start ||
          (!range.price && !range.min && !range.max)} onClick={() => save("/api/v1/host/calendar/pricing/ranges", "POST", {
          listing_id: listingId, kind: range.kind, name: range.name,
          start_date: range.start, end_date: format(addDays(parseISO(range.end), 1), "yyyy-MM-dd"),
          price_per_night: range.price === "" ? null : Number(range.price),
          min_nights: range.min === "" ? null : Number(range.min),
          max_nights: range.max === "" ? null : Number(range.max),
        }, () => setRange(emptyRange))}>{t("pricing.addRange")}</Button>
      </div>

      {rangeRules.length > 0 && <div className="space-y-2">
        <h3 className="font-semibold text-ink">{t("pricing.savedRanges")}</h3>
        {rangeRules.map((rule) => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line p-3 text-sm">
          <span>{rule.name || t(`pricing.${rule.kind}`)} · {format(parseISO(rule.start_date), "dd/MM/yyyy")} – {format(addDays(parseISO(rule.end_date), -1), "dd/MM/yyyy")}
            {rule.price_per_night ? ` · ${money(rule.price_per_night)}` : ""}
            {rule.min_nights ? ` · ${t("pricing.minNights")}: ${rule.min_nights}` : ""}
            {rule.max_nights ? ` · ${t("pricing.maxNights")}: ${rule.max_nights}` : ""}</span>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => save(
            `/api/v1/host/calendar/pricing/ranges/${rule.id}?listing_id=${listingId}`, "DELETE",
          )}>{t("common.delete")}</Button>
        </div>)}
      </div>}
    </section>
  );
}
