"use client";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Line } from "react-chartjs-2";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatVND } from "@/lib/format";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function RevenueChart({ labels, values }) {
  const { locale, t } = useLocale();
  const numberLocale = locale === "en" ? "en-US" : "vi-VN";
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatVND(context.raw, numberLocale) } } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatVND(value, numberLocale) } } } };
  const data = { labels, datasets: [{ fill: true, label: t("host.revenue"), data: values, borderColor: "#C9364F", backgroundColor: "rgba(201, 54, 79, 0.1)", tension: 0.4 }] };
  return <div className="h-[300px] min-w-0"><Line options={options} data={data} role="img" aria-label={t("host.chartTitle")} /></div>;
}
