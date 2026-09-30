"use client";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Line } from "react-chartjs-2";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatVND } from "@/lib/format";
import { useTheme } from "next-themes";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function RevenueChart({ labels, values }) {
  const { locale, t } = useLocale();
  const { resolvedTheme } = useTheme();
  const numberLocale = locale === "en" ? "en-US" : "vi-VN";
  const tickColor = (context) => `rgb(${getComputedStyle(context.chart.canvas).getPropertyValue("--color-muted-ink")})`;
  const gridColor = (context) => `rgb(${getComputedStyle(context.chart.canvas).getPropertyValue("--color-line")})`;
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatVND(context.raw, numberLocale) } } }, scales: { x: { ticks: { color: tickColor }, grid: { color: gridColor } }, y: { beginAtZero: true, ticks: { color: tickColor, callback: (value) => formatVND(value, numberLocale) }, grid: { color: gridColor } } } };
  const data = { labels, datasets: [{ fill: true, label: t("host.revenue"), data: values, borderColor: (context) => `rgb(${getComputedStyle(context.chart.canvas).getPropertyValue("--color-accent")})`, backgroundColor: (context) => `rgb(${getComputedStyle(context.chart.canvas).getPropertyValue("--color-accent")} / 0.1)`, tension: 0.4 }] };
  return <div className="h-[300px] min-w-0"><Line key={resolvedTheme} options={options} data={data} role="img" aria-label={t("host.chartTitle")} /></div>;
}
