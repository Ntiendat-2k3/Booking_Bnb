"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/templates/AdminShell";
import { apiFetch } from "@/lib/api";
import { isAdminRole } from "@/lib/roles";
import { adminService } from "@/services/adminService";
import AnalyticsPanel from "@/components/organisms/AnalyticsPanel";
import RipleLoading from "@/components/atoms/RipleLoading";
import { Users, Home, Sparkles, CalendarCheck, CreditCard, Star, ArrowUpRight } from "lucide-react";

export default function DashboardPage() {
  const t = useTranslations();
  const { locale } = useLocale();
  const numberLocale = locale === "vn" ? "vi-VN" : "en-US";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingListings: 0,
    activeBookings: 0,
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

  const metrics = [
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

        <section className="grid gap-3 sm:grid-cols-3" aria-label={t("dashboard.metrics")}>
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

        <AnalyticsPanel />

        <section className="admin-surface p-5 sm:p-6" aria-labelledby="quick-links-heading">
          <div className="mb-5 border-b border-[var(--admin-line)] pb-4">
            <h2 id="quick-links-heading" className="text-lg font-semibold">{t("dashboard.quickLinks")}</h2>
            <p className="mt-1 text-xs ui-muted">{t("dashboard.jumpToArea")}</p>
          </div>
          <div className="grid gap-px border border-[var(--admin-line)] bg-[var(--admin-line)] sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="group flex min-h-16 items-center justify-between gap-3 bg-[var(--admin-surface)] px-4 text-sm font-medium transition-colors hover:bg-[var(--admin-hover)]">
                <span className="flex items-center gap-3"><Icon className="h-5 w-5 text-[var(--admin-positive)]" strokeWidth={1.8} aria-hidden="true" />{label}</span>
                <ArrowUpRight className="h-4 w-4 text-[var(--admin-muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
