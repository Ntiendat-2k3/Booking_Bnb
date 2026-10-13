"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/templates/AdminShell";
import { apiFetch } from "@/lib/api";
import { isAdminRole } from "@/lib/roles";
import { adminService } from "@/services/adminService";
import { formatRevenueChartData } from "@/lib/revenueChart";
import RipleLoading from "@/components/atoms/RipleLoading";
import { Users, Home, Sparkles, CalendarCheck, CreditCard, Star, ArrowUpRight, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function CustomTooltip({ active, payload, label, formatMoney }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      <p className="font-semibold text-[var(--admin-positive)]">{formatMoney(payload[0].value || 0)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations();
  const { locale } = useLocale();
  const numberLocale = locale === "vn" ? "vi-VN" : "en-US";
  const money = new Intl.NumberFormat(numberLocale, { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    pendingListings: 0,
    activeBookings: 0,
    chartData: [],
  });

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        const csrfRes = await apiFetch("/api/v1/auth/csrf", { method: "GET" });
        if (csrfRes?.data?.csrfToken) {
          const { setManualCsrfToken } = await import("@/lib/api");
          setManualCsrfToken(csrfRes.data.csrfToken);
        }
        const profile = await apiFetch("/api/v1/auth/profile", { method: "GET" });
        if (!isAdminRole(profile.data?.role)) throw new Error("not admin");
        const res = await adminService.getDashboardStats();
        if (alive && res.data) setStats(res.data);
      } catch (err) {
        console.error("Dashboard boot err:", err);
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    }
    boot();
    return () => { alive = false; };
  }, [router]);

  if (loading) return <RipleLoading />;

  const chartData = formatRevenueChartData(stats.chartData, locale);

  const metrics = [
    { label: t("dashboard.totalRevenue"), value: money.format(stats.totalRevenue || 0), icon: CreditCard, note: t("dashboard.recordedRevenue") },
    { label: t("dashboard.totalUsers"), value: (stats.totalUsers || 0).toLocaleString(numberLocale), icon: Users, note: t("dashboard.registeredAccounts") },
    { label: t("dashboard.pendingListings"), value: (stats.pendingListings || 0).toLocaleString(numberLocale), icon: Home, note: t("dashboard.awaitingReview") },
    { label: t("dashboard.activeBookings"), value: (stats.activeBookings || 0).toLocaleString(numberLocale), icon: CalendarCheck, note: t("dashboard.currentReservations") },
  ];

  const shortcuts = [
    { href: "/dashboard/users", label: t("nav.users"), icon: Users },
    { href: "/dashboard/listings", label: t("nav.listings"), icon: Home },
    { href: "/dashboard/amenities", label: t("nav.amenities"), icon: Sparkles },
    { href: "/dashboard/bookings", label: t("nav.bookings"), icon: CalendarCheck },
    { href: "/dashboard/payments", label: t("nav.payments"), icon: CreditCard },
    { href: "/dashboard/reviews", label: t("nav.reviews"), icon: Star },
  ];

  return (
    <AdminShell>
      <div className="space-y-7">
        <div className="admin-page-intro flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="admin-overline mb-2">{t("dashboard.workspaceOverview")}</p>
            <h1>{t("nav.overview")}</h1>
            <p className="mt-2 max-w-xl text-sm ui-muted">{t("dashboard.description")}</p>
          </div>
          <span className="border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-2 text-xs font-medium text-[var(--admin-muted)]">Booking BnB / {t("nav.adminConsole")}</span>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("dashboard.metrics")}>
          {metrics.map(({ label, value, icon: Icon, note }, index) => (
            <div key={label} className="admin-surface min-w-0 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="admin-overline">0{index + 1} / {label}</span>
                <Icon className="h-5 w-5 text-[var(--admin-positive)]" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <div className="mt-5 truncate text-2xl font-semibold tracking-[-0.05em] sm:text-[1.75rem]" title={value}>{value}</div>
              <div className="mt-2 text-xs ui-muted">{note}</div>
            </div>
          ))}
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
          <section className="admin-surface min-w-0 p-5 sm:p-6" aria-labelledby="revenue-heading">
            <div className="mb-6 flex items-start justify-between gap-3 border-b border-[var(--admin-line)] pb-4">
              <div>
                <h2 id="revenue-heading" className="text-lg font-semibold">{t("dashboard.revenueOverview")}</h2>
                <p className="mt-1 text-xs ui-muted">{t("dashboard.monthlyPerformance")}</p>
              </div>
              <TrendingUp className="h-5 w-5 shrink-0 text-[var(--admin-positive)]" aria-hidden="true" />
            </div>
            {chartData.length ? (
              <div className="h-72 w-full" role="img" aria-label={t("dashboard.monthlyRevenueChart")}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--admin-positive)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--admin-positive)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--admin-line)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 11 }} dy={10} />
                    <YAxis width={58} axisLine={false} tickLine={false} tick={{ fill: "var(--admin-muted)", fontSize: 11 }} tickFormatter={(value) => new Intl.NumberFormat(numberLocale, { notation: "compact", maximumFractionDigits: 1 }).format(value)} />
                    <Tooltip content={<CustomTooltip formatMoney={(value) => money.format(value)} />} />
                    <Area type="monotone" dataKey="value" stroke="var(--admin-positive)" strokeWidth={2} fill="url(#revenueFill)" dot={chartData.length === 1 ? { r: 4 } : false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center border border-dashed border-[var(--admin-line)] bg-[var(--admin-canvas)] px-5 text-center text-sm ui-muted">{t("dashboard.noRevenue")}</div>
            )}
          </section>

          <section className="admin-surface p-5 sm:p-6" aria-labelledby="quick-links-heading">
            <div className="mb-5 border-b border-[var(--admin-line)] pb-4">
              <h2 id="quick-links-heading" className="text-lg font-semibold">{t("dashboard.quickLinks")}</h2>
              <p className="mt-1 text-xs ui-muted">{t("dashboard.jumpToArea")}</p>
            </div>
            <div className="grid gap-px border border-[var(--admin-line)] bg-[var(--admin-line)] sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {shortcuts.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="group flex min-h-16 items-center justify-between gap-3 bg-[var(--admin-surface)] px-4 text-sm font-medium transition-colors hover:bg-[var(--admin-hover)]">
                  <span className="flex items-center gap-3"><Icon className="h-5 w-5 text-[var(--admin-positive)]" strokeWidth={1.8} aria-hidden="true" />{label}</span>
                  <ArrowUpRight className="h-4 w-4 text-[var(--admin-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
