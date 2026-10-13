"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/templates/AdminShell";
import { adminService } from "@/services/adminService";
import Input from "@/components/atoms/Input";
import Select from "@/components/atoms/Select";
import { CreditCard, ArrowLeftRight, CircleCheck, Clock3, Banknote, Search } from "lucide-react";
import RipleLoading from "@/components/atoms/RipleLoading";
import AdminPagination from "@/components/molecules/AdminPagination";
import AdminPageHeader from "@/components/molecules/AdminPageHeader";
import StatCard from "@/components/molecules/StatCard";

import PaymentsTable from "@/components/organisms/payments/PaymentsTable";
import PaymentDetailModal from "@/components/organisms/payments/PaymentDetailModal";
import { toast } from "sonner";
import useDebouncedValue from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 10;

export default function Page() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1, summary: {} });
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const [page, setPage] = useState(1);
  const [filterSt, setFilterSt] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const filtered = items;

  useEffect(() => {
    setPage(1);
  }, [q, filterSt]);

  const pageCount = Math.max(1, meta.total_pages);
  const pagedItems = items;

  const loadItems = useCallback(async (signal) => {
    try {
      const res = await adminService.getPayments({ status: filterSt, q: debouncedQ, page, limit: PAGE_SIZE, signal });
      if (!signal?.aborted) {
        setItems(res.data?.items || []);
        setMeta(res.data?.meta || { total: 0, total_pages: 1, summary: {} });
        if (page > (res.data?.meta?.total_pages || 1)) setPage(Math.max(1, res.data.meta.total_pages));
      }
    } catch (e) {
      if (!signal?.aborted && e?.name !== "AbortError") toast.error(e?.message || t("common.loadFailed", { item: t("nav.payments") }));
    }
  }, [filterSt, debouncedQ, page, t]);

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

  function openDetail(p) {
    setDetail(p);
    setDetailOpen(true);
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <AdminPageHeader icon={CreditCard} title={t("nav.payments")} description={t("ui.paymentsDescription")}>
          <label className="admin-search"><Search size={18} aria-hidden="true" /><Input aria-label={t("payments.search")} value={q} maxLength={255} onChange={(e) => setQ(e.target.value)} placeholder={t("payments.search")} /></label>
          <Select aria-label={t("common.status")} value={filterSt} onChange={(e) => setFilterSt(e.target.value)}>
            <option value="all">{t("payments.allStatuses")}</option>
            <option value="pending">{t("statuses.pending")}</option>
            <option value="succeeded">{t("statuses.succeeded")}</option>
            <option value="failed">{t("statuses.failed")}</option>
            <option value="refunded">{t("statuses.refunded")}</option>
          </Select>
        </AdminPageHeader>

        <div className="admin-stats">
          <StatCard icon={ArrowLeftRight} label={t("ui.totalPayments")} value={meta.total} />
          <StatCard icon={CircleCheck} label={t("ui.successfulPayments")} value={meta.summary?.succeeded || 0} />
          <StatCard icon={Clock3} label={t("ui.pendingPayments")} value={meta.summary?.pending || 0} tone="amber" />
          <StatCard icon={Banknote} label={t("ui.totalRevenue")} value={new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(meta.summary?.revenue || 0)} />
        </div>
        {q.trim() || filterSt !== "all" ? <p className="text-xs ui-muted">{t("ui.filteredMetrics")}</p> : null}

        <PaymentsTable
          pagedItems={pagedItems}
          filtered={filtered}
          openDetail={openDetail}
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} total={meta.total} itemLabel={t("nav.payments")} />
      </div>

      <PaymentDetailModal
        detailOpen={detailOpen}
        setDetailOpen={setDetailOpen}
        detail={detail}
      />
    </AdminShell>
  );
}
