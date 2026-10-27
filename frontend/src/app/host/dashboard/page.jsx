"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format, parseISO, subDays } from "date-fns";
import Container from "@/components/layout/Container";
import Button from "@/components/atoms/Button";
import DateField from "@/components/molecules/DateField";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";

const RevenueChart = dynamic(() => import("@/components/organisms/RevenueChart"), { ssr: false });
const today = () => format(new Date(), "yyyy-MM-dd");

/** Dashboard chỉ dùng báo cáo đã giới hạn bằng Host ID từ phiên đăng nhập trên API. */
export default function HostDashboardPage() {
  const { locale, t } = useLocale();
  const [period, setPeriod] = useState("month");
  const [date, setDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const requestKey = `${period}:${date}`;
  const loading = loadedKey !== requestKey;
  const numberLocale = locale === "en" ? "en-US" : "vi-VN";
  const money = (value) => formatVND(value, numberLocale);
  const percent = (value) => `${Number(value || 0).toLocaleString(numberLocale, { maximumFractionDigits: 2 })}%`;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/v1/host/dashboard/analytics", {
      params: { period, date }, signal: controller.signal,
    }).then((response) => { if (!controller.signal.aborted) {
      setReport(response.data); setError(""); setLoadedKey(requestKey);
    } }).catch((cause) => { if (!controller.signal.aborted) {
      setReport(null); setError(cause.message || t("analytics.loadFailed")); setLoadedKey(requestKey);
    } });
    return () => controller.abort();
  }, [period, date, requestKey, t]);

  async function downloadCsv() {
    setExporting(true);
    try {
      const blob = await apiFetch("/api/v1/host/dashboard/analytics.csv", {
        params: { period, date }, responseType: "blob",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `host-analytics-${report.start}-${report.end}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause.message || t("analytics.exportFailed")); }
    finally { setExporting(false); }
  }

  const totals = report?.totals;
  const cards = totals ? [
    ["net", money(totals.net)],
    ["successful", totals.successful, t("analytics.successfulHint")],
    ["occupancy", percent(totals.occupancy_rate), `${totals.sold_nights}/${totals.available_nights} ${t("analytics.nights")}`],
  ] : [];
  const detailCards = totals ? [
    ["gross", money(totals.gross)],
    ["refunds", money(totals.refunds)],
    ["cancelled", totals.cancelled],
    ["completed", totals.completed],
    ["cancellationRate", percent(totals.cancellation_rate)],
    ["adr", money(totals.adr)],
    ["revpar", money(totals.revpar)],
    ["views", totals.views],
    ["starts", totals.started],
    ["conversion", percent(totals.conversion_rate)],
  ] : [];

  return <Container className="space-y-7 py-5 sm:py-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="page-heading">{t("analytics.title")}</h1>
        <p className="mt-2 text-sm text-muted-ink">{t("analytics.description")}</p></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-medium text-ink">{t("analytics.period")}
          <select className="field-control" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {["day", "month", "quarter", "year"].map((item) =>
              <option key={item} value={item}>{t(`analytics.${item}`)}</option>)}
          </select></label>
        <DateField label={t("analytics.referenceDate")} selected={parseISO(date)}
          onChange={(selected) => { if (selected) setDate(format(selected, "yyyy-MM-dd")); }} />
        <Button size="sm" variant="secondary" onClick={downloadCsv}
          disabled={!report || loading || exporting}>{t("analytics.exportCsv")}</Button>
      </div>
    </header>
    {!loading && error && <p role="alert" className="surface-panel p-4 text-danger">{error}</p>}
    {loading && <p role="status" className="surface-panel p-5 text-muted-ink">{t("common.loading")}</p>}
    {!loading && report && <>
      <p className="text-sm text-muted-ink">
        {format(parseISO(report.start), "dd/MM/yyyy")} – {format(subDays(parseISO(report.end), 1), "dd/MM/yyyy")} · {t("analytics.utcNote")}
      </p>
      <section className="grid gap-3 sm:grid-cols-3" aria-label={t("analytics.kpis")}>
        {cards.map(([key, value, note]) => <div key={key} className="surface-panel min-w-0 p-5">
          <h2 className="text-sm font-medium text-muted-ink">{t(`analytics.${key}`)}</h2>
          <p className="mt-3 break-words text-2xl font-bold text-ink">{value}</p>
          {note && <p className="mt-2 text-xs text-muted-ink">{note}</p>}
          {key === "net" && <p className="mt-2 text-xs text-muted-ink">
            {t("analytics.gross")}: {money(totals.gross)} · {t("analytics.refunds")}: {money(totals.refunds)}
          </p>}
        </div>)}
      </section>
      <section className="surface-panel p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-bold text-ink">{t("analytics.revenueChart")}</h2>
        <RevenueChart labels={report.chart.map((point) => point.date.length === 7
          ? format(parseISO(`${point.date}-01`), "MM/yyyy")
          : format(parseISO(point.date), "dd/MM/yyyy"))}
          values={report.chart.map((point) => Number(point.net))} />
      </section>
      <section className="surface-panel p-5">
        <h2 className="font-bold text-ink">{t("analytics.topListings")}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{report.top_listings.map((item, index) =>
          <Link key={item.listing_id} href={`/host/listings/${item.listing_id}`}
            className="rounded-control border border-line p-3 hover:bg-muted-surface">
            <span className="text-xs text-muted-ink">#{index + 1}</span>
            <strong className="mt-1 block truncate text-ink">{item.title}</strong>
            <span className="mt-2 block text-sm">{money(item.net)}</span>
          </Link>)}</div>
      </section>
      <details className="surface-panel p-5">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-ink">{t("analytics.moreDetails")}</summary>
        <div className="mt-4 space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("analytics.kpis")}>
            {detailCards.map(([key, value, note]) => <div key={key} className="rounded-control border border-line p-4">
              <h2 className="text-sm text-muted-ink">{t(`analytics.${key}`)}</h2>
              <p className="mt-2 font-semibold text-ink">{value}</p>
              {note && <p className="mt-1 text-xs text-muted-ink">{note}</p>}
            </div>)}
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            {[["highDemand", report.high_demand], ["lowDemand", report.low_demand]].map(([key, days]) =>
              <section key={key}>
                <h2 className="font-bold text-ink">{t(`analytics.${key}`)}</h2>
                {days.length ? <ul className="mt-4 space-y-2 text-sm">{days.map((day) =>
                  <li key={day.date} className="flex justify-between gap-3 border-b border-line pb-2">
                    <span>{format(parseISO(day.date), "dd/MM/yyyy")}</span><span>{day.sold_nights}/{day.available_nights} · {percent(day.occupancy_rate)}</span>
                  </li>)}</ul> : <p className="mt-3 text-sm text-muted-ink">{t("analytics.noData")}</p>}
              </section>)}
          </div>
          <section className="overflow-hidden">
            <h2 className="mb-4 font-bold text-ink">{t("analytics.listingPerformance")}</h2>
            <div className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-sm">
              <thead><tr className="border-b border-line bg-muted-surface/50">
                {["listing", "net", "occupancy", "adr", "revpar", "views", "starts", "conversion"].map((key) =>
                  <th key={key} className="p-3 font-semibold">{t(`analytics.${key}`)}</th>)}
              </tr></thead><tbody>{report.listings.map((item) =>
                <tr key={item.listing_id} className="border-b border-line">
                  <td className="p-3 font-medium text-ink">{item.title}</td>
                  <td className="p-3">{money(item.net)}</td>
                  <td className="p-3">{percent(item.occupancy_rate)}</td>
                  <td className="p-3">{money(item.adr)}</td>
                  <td className="p-3">{money(item.revpar)}</td>
                  <td className="p-3">{item.views}</td><td className="p-3">{item.started}</td>
                  <td className="p-3">{percent(item.conversion_rate)}</td>
                </tr>)}</tbody></table></div>
          </section>
          <p className="text-xs leading-5 text-muted-ink">{t("analytics.kpiDefinition")}</p>
        </div>
      </details>
    </>}
  </Container>;
}
