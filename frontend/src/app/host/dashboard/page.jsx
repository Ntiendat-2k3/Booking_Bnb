"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import Container from "@/components/layout/Container";
import dynamic from "next/dynamic";
import Avatar from "@/components/atoms/Avatar";
import { useLocale } from "@/i18n/LocaleProvider";
const RevenueChart = dynamic(() => import("@/components/organisms/RevenueChart"), { ssr: false });

export default function HostDashboardPage() {
  const { locale, t } = useLocale();
  const user = useSelector((s) => s.auth.user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/v1/host/dashboard");
        setStats(res.data);
      } catch (err) {
        console.error("Lỗi khi tải thống kê:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Container className="py-12 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </Container>
    );
  }

  if (!stats) return <Container className="py-12 text-center text-muted-ink">{t("common.loadFailed")}</Container>;

  return (
    <Container className="space-y-8 py-4 sm:py-6">
      <div>
        <h1 className="page-heading">{t("host.revenueTitle")}</h1>
        <p className="text-muted-ink mt-2">{t("host.revenueDescription")}</p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-panel bg-ink p-6 text-on-ink sm:p-8">
          <div className="mb-4 text-sm font-medium text-on-ink/75">{t("host.totalRevenue")}</div>
          <div className="break-words text-3xl font-bold tracking-tight">{formatVND(stats.totalRevenue, locale === "en" ? "en-US" : "vi-VN")}</div>
        </div>
        <div className="surface-panel p-6 sm:p-8">
          <div className="mb-4 text-sm font-medium text-muted-ink">{t("host.bookings")}</div>
          <div className="text-3xl font-bold text-ink">{stats.totalBookings}</div>
        </div>
        <div className="surface-panel p-6 sm:p-8">
          <div className="mb-4 text-sm font-medium text-muted-ink">{t("host.pendingPayment")}</div>
          <div className="text-3xl font-bold text-ink">{stats.pendingBookings}</div>
        </div>
      </div>


      <div className="surface-panel p-6 sm:p-8">
        <h3 className="text-lg font-bold text-ink mb-6">{t("host.chartTitle")}</h3>
        <RevenueChart labels={stats.chartLabels} values={stats.chartValues} />
      </div>


      <div className="surface-panel overflow-hidden">
         <div className="p-6 border-b border-line bg-muted-surface">
            <h3 className="text-lg font-bold text-ink">{t("host.recent")}</h3>
         </div>
         <div className="divide-y divide-line">
           {stats.recentBookings.length === 0 ? (
             <div className="p-6 text-center text-muted-ink">{t("host.noTransactions")}</div>
           ) : (
             stats.recentBookings.map((b) => (
               <div key={b.id} className="p-6 flex flex-wrap items-center justify-between gap-4 hover:bg-muted-surface transition">
                 <div className="flex items-center gap-4">
                   <Avatar src={b.guest?.avatar_url} name={b.guest?.full_name || t("host.guestAlt")} size={48} />
                   <div>
                     <div className="font-semibold text-ink">{b.listing?.title}</div>
                     <div className="text-sm text-muted-ink">{t("host.guestLabel")}{b.guest?.full_name}</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="font-bold text-ink">{formatVND(b.total_amount, locale === "en" ? "en-US" : "vi-VN")}</div>
                   <div className="text-xs text-muted-ink">
                     {new Date(b.created_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")}
                   </div>
                 </div>
               </div>
             ))
           )}
         </div>
      </div>
    </Container>
  );
}
