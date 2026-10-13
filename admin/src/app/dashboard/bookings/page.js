"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AdminShell from "@/components/templates/AdminShell";
import { adminService } from "@/services/adminService";
import Input from "@/components/atoms/Input";
import Select from "@/components/atoms/Select";
import RipleLoading from "@/components/atoms/RipleLoading";
import AdminPagination from "@/components/molecules/AdminPagination";
import AdminPageHeader from "@/components/molecules/AdminPageHeader";
import StatCard from "@/components/molecules/StatCard";
import { CalendarDays, FileText, CircleCheck, Clock3, CircleX, Search } from "lucide-react";

import BookingsTable from "@/components/organisms/bookings/BookingsTable";
import BookingDetailModal from "@/components/organisms/bookings/BookingDetailModal";
import useDebouncedValue from "@/hooks/useDebouncedValue";

const STATUS = [
  "all",
  "pending_payment",
  "confirmed",
  "cancelled",
  "completed",
];

const PAGE_SIZE = 10;

export default function Page() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1, statuses: {} });
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = items;

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  const pageCount = Math.max(1, meta.total_pages);
  const pagedItems = items;

  const loadItems = useCallback(async (signal) => {
    try {
      const res = await adminService.getBookings({ status, q: debouncedQ, page, limit: PAGE_SIZE, signal });
      if (!signal?.aborted) {
        setItems(res.data?.items || []);
        setMeta(res.data?.meta || { total: 0, total_pages: 1, statuses: {} });
        if (page > (res.data?.meta?.total_pages || 1)) setPage(Math.max(1, res.data.meta.total_pages));
      }
    } catch (e) {
      if (!signal?.aborted && e?.name !== "AbortError") toast.error(e?.message || t("common.loadFailed", { item: t("nav.bookings") }));
    }
  }, [status, debouncedQ, page, t]);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    async function init() {
      try {
        await loadItems(controller.signal);
      } finally {
        if (alive) setLoading(false);
      }
    }
    init();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [loadItems]);

  async function openDetail(id) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await adminService.getBookingDetail(id);
      setDetail(res.data?.booking || null);
    } catch (e) {
      toast.error(e?.message || t("common.loadFailed", { item: t("common.booking") }));
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <AdminPageHeader icon={CalendarDays} title={t("nav.bookings")} description={t("ui.bookingsDescription")}>
          <label className="admin-search"><Search size={18} aria-hidden="true" /><Input aria-label={t("bookings.search")} value={q} maxLength={255} onChange={(e) => setQ(e.target.value)} placeholder={t("bookings.search")} /></label>
          <Select aria-label={t("common.status")} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => <option key={s} value={s}>{t(`statuses.${s}`)}</option>)}
          </Select>
        </AdminPageHeader>

        <div className="admin-stats">
          <StatCard icon={FileText} label={t("ui.totalBookings")} value={meta.total} />
          <StatCard icon={CircleCheck} label={t("ui.completedBookings")} value={meta.statuses?.completed || 0} />
          <StatCard icon={Clock3} label={t("ui.pendingBookings")} value={meta.statuses?.pending_payment || 0} tone="amber" />
          <StatCard icon={CircleX} label={t("ui.cancelledBookings")} value={meta.statuses?.cancelled || 0} tone="red" />
        </div>
        {q.trim() || status !== "all" ? <p className="text-xs ui-muted">{t("ui.filteredMetrics")}</p> : null}

        <BookingsTable
          pagedItems={pagedItems}
          filtered={filtered}
          openDetail={openDetail}
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} total={meta.total} itemLabel={t("nav.bookings")} />
      </div>

      <BookingDetailModal
        detailOpen={detailOpen}
        setDetailOpen={setDetailOpen}
        detail={detail}
        detailLoading={detailLoading}
      />
    </AdminShell>
  );
}
