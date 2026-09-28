"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import Container from "@/components/layout/Container";
import dynamic from "next/dynamic";
import Image from "next/image";
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
    <Container className="py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-ink">{t("host.revenueTitle")}</h1>
        <p className="text-muted-ink mt-2">{t("host.revenueDescription")}</p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-line p-6 rounded-2xl shadow-sm">
          <div className="text-muted-ink text-sm font-semibold uppercase mb-1">{t("host.totalRevenue")}</div>
          <div className="text-3xl font-bold text-ink">{formatVND(stats.totalRevenue, locale === "en" ? "en-US" : "vi-VN")}</div>
        </div>
        <div className="bg-surface border border-line p-6 rounded-2xl shadow-sm">
          <div className="text-muted-ink text-sm font-semibold uppercase mb-1">{t("host.bookings")}</div>
          <div className="text-3xl font-bold text-ink">{stats.totalBookings}</div>
        </div>
        <div className="bg-surface border border-line p-6 rounded-2xl shadow-sm">
          <div className="text-muted-ink text-sm font-semibold uppercase mb-1">{t("host.pendingPayment")}</div>
          <div className="text-3xl font-bold text-ink">{stats.pendingBookings}</div>
        </div>
      </div>


      <div className="bg-surface border border-line p-6 rounded-2xl shadow-sm">
        <h3 className="text-lg font-bold text-ink mb-6">{t("host.chartTitle")}</h3>
        <RevenueChart labels={stats.chartLabels} values={stats.chartValues} />
      </div>


      <div className="bg-surface border border-line rounded-2xl shadow-sm overflow-hidden">
         <div className="p-6 border-b border-line bg-muted-surface">
            <h3 className="text-lg font-bold text-ink">{t("host.recent")}</h3>
         </div>
         <div className="divide-y divide-slate-200">
           {stats.recentBookings.length === 0 ? (
             <div className="p-6 text-center text-muted-ink">{t("host.noTransactions")}</div>
           ) : (
             stats.recentBookings.map((b) => (
               <div key={b.id} className="p-6 flex flex-wrap items-center justify-between gap-4 hover:bg-muted-surface transition">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 relative rounded-full overflow-hidden bg-slate-200 border">
                     {b.guest?.avatar_url ? (
                       <Image src={b.guest.avatar_url} alt={t("host.guestAlt")} fill className="object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center font-bold text-muted-ink">
                         {b.guest?.full_name?.charAt(0)}
                       </div>
                     )}
                   </div>
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
