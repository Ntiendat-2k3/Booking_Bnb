"use client";

import { useEffect, useRef, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays } from "lucide-react";
import { adminService } from "@/services/adminService";
import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import { formatDateOnly } from "@/lib/BookingUtils";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const chartDate = (value) => value.length === 7
  ? `${value.slice(5, 7)}/${value.slice(0, 4)}` : formatDateOnly(value);

/** Tổng hợp toàn hệ thống chỉ được tải từ API yêu cầu quyền Admin. */
export default function AnalyticsPanel() {
  const t = useTranslations();
  const { locale } = useLocale();
  const [period, setPeriod] = useState("month");
  const [date, setDate] = useState(today);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const dateInputRef = useRef(null);
  const requestKey = `${period}:${date}`;
  const loading = loadedKey !== requestKey;
  const numberLocale = locale === "vn" ? "vi-VN" : "en-US";
  const money = (value) => new Intl.NumberFormat(numberLocale, {
    style: "currency", currency: "VND", maximumFractionDigits: 0,
  }).format(Number(value || 0));

  useEffect(() => {
    const controller = new AbortController();
    adminService.getAnalytics(period, date, controller.signal)
      .then((result) => { if (!controller.signal.aborted) {
        setReport(result.data); setError(""); setLoadedKey(requestKey);
      } }).catch((cause) => { if (!controller.signal.aborted) {
        setReport(null); setError(cause.message || t("analytics.loadFailed")); setLoadedKey(requestKey);
      } });
    return () => controller.abort();
  }, [period, date, requestKey, t]);

  const totals = report?.totals;
  const percent = (value) => `${Number(value || 0).toLocaleString(numberLocale, { maximumFractionDigits: 2 })}%`;
  const cards = totals ? [
    ["net", money(totals.net)], ["successful", totals.successful],
    ["occupancy", percent(totals.occupancy_rate)],
  ] : [];
  const detailCards = totals ? [
    ["gross", money(totals.gross)], ["refunds", money(totals.refunds)],
    ["cancelled", totals.cancelled], ["completed", totals.completed],
    ["cancellationRate", percent(totals.cancellation_rate)],
    ["adr", money(totals.adr)], ["revpar", money(totals.revpar)],
    ["views", totals.views], ["starts", totals.started],
    ["conversion", percent(totals.conversion_rate)],
  ] : [];

  return <section className="admin-surface space-y-5 p-5 sm:p-6" aria-label={t("analytics.title")}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-lg font-semibold">{t("analytics.title")}</h2>
        <p className="mt-1 text-xs ui-muted">{t("analytics.description")}</p></div>
      <div className="flex flex-wrap gap-2">
        <label className="grid gap-1 text-xs">{t("analytics.period")}
          <select className="rounded border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-2"
            value={period} onChange={(event) => setPeriod(event.target.value)}>
            {["day", "month", "quarter", "year"].map((item) =>
              <option key={item} value={item}>{t(`analytics.${item}`)}</option>)}
          </select></label>
        <div className="grid gap-1 text-xs">
          <span id="analytics-date-label">{t("analytics.date")}</span>
          <button type="button" aria-labelledby="analytics-date-label analytics-date-value"
            className="flex min-h-9 items-center justify-between gap-3 rounded border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-2 text-left"
            onClick={() => {
              if (dateInputRef.current?.showPicker) dateInputRef.current.showPicker();
              else dateInputRef.current?.click();
            }}>
            <span id="analytics-date-value">{formatDateOnly(date)}</span>
            <CalendarDays size={16} aria-hidden="true" />
          </button>
          <input ref={dateInputRef} type="date" value={date}
            onChange={(event) => { if (event.target.value) setDate(event.target.value); }}
            tabIndex={-1} aria-label={t("analytics.date")} className="sr-only" />
        </div>
      </div>
    </div>
    {!loading && error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    {loading ? <p role="status" className="text-sm ui-muted">{t("common.loading")}</p> : report && <>
      <p className="text-xs ui-muted">{formatDateOnly(report.start)} – {formatDateOnly(new Date(Date.parse(report.end) - 86400000).toISOString().slice(0, 10))} · UTC</p>
      <div className="grid gap-3 sm:grid-cols-3">{cards.map(([key, value]) =>
        <div key={key} className="rounded border border-[var(--admin-line)] p-3">
          <p className="text-xs ui-muted">{t(`analytics.${key}`)}</p>
          <p className="mt-2 break-words font-semibold">{value}</p>
          {key === "net" && <p className="mt-2 text-xs ui-muted">
            {t("analytics.gross")}: {money(totals.gross)} · {t("analytics.refunds")}: {money(totals.refunds)}
          </p>}
          {key === "successful" && <p className="mt-2 text-xs ui-muted">{t("analytics.successfulHint")}</p>}
          {key === "occupancy" && <p className="mt-2 text-xs ui-muted">
            {totals.sold_nights}/{totals.available_nights} {t("analytics.nights")}
          </p>}
        </div>)}</div>
      <div className="h-56" role="img" aria-label={t("analytics.chart")}>
        <ResponsiveContainer width="100%" height="100%"><AreaChart data={report.chart.map((item) =>
          ({ date: item.date, net: Number(item.net) }))}>
          <XAxis dataKey="date" tickFormatter={chartDate} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value) => money(value)} labelFormatter={chartDate} />
          <Area dataKey="net" stroke="var(--admin-positive)" fill="var(--admin-positive)" fillOpacity={0.15} />
        </AreaChart></ResponsiveContainer>
      </div>
      <div><h3 className="font-semibold">{t("analytics.topListings")}</h3>
        <ul className="mt-2 space-y-1 text-sm">{report.top_listings.map((item) =>
          <li key={item.listing_id} className="flex justify-between gap-3 border-b border-[var(--admin-line)] py-1">
            <span className="truncate">{item.title}</span><span>{money(item.net)}</span>
          </li>)}</ul></div>
      <details className="border-t border-[var(--admin-line)] pt-2">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{t("analytics.moreDetails")}</summary>
        <div className="mt-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{detailCards.map(([key, value]) =>
            <div key={key} className="rounded border border-[var(--admin-line)] p-3">
              <p className="text-xs ui-muted">{t(`analytics.${key}`)}</p>
              <p className="mt-2 break-words font-semibold">{value}</p>
            </div>)}</div>
          <p className="text-xs ui-muted">{t("analytics.previousNet")}: {money(report.previous.net)}</p>
          <div><h3 className="font-semibold">{t("analytics.highDemand")}</h3>
            <ul className="mt-2 space-y-1 text-sm">{report.high_demand.map((item) =>
              <li key={item.date} className="flex justify-between gap-3 border-b border-[var(--admin-line)] py-1">
                <span>{formatDateOnly(item.date)}</span><span>{percent(item.occupancy_rate)}</span>
              </li>)}</ul></div>
          <p className="text-xs ui-muted">{t("analytics.definition")}</p>
        </div>
      </details>
    </>}
  </section>;
}
