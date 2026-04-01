"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { CreditCard } from "lucide-react";
import RipleLoading from "@/components/loading/RipleLoading";
import AdminPagination from "@/components/admin/AdminPagination";

import PaymentsTable from "@/components/admin/payments/PaymentsTable";
import PaymentDetailModal from "@/components/admin/payments/PaymentDetailModal";

const PAGE_SIZE = 10;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [filterSt, setFilterSt] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let base = items;
    if (filterSt !== "all") {
      base = base.filter((p) => p.status === filterSt);
    }
    if (!s) return base;
    return base.filter((p) => {
      return (
        String(p.id).includes(s) ||
        String(p.booking_id || "").includes(s) ||
        (p.transaction_id || "").toLowerCase().includes(s) ||
        (p.user?.email || "").toLowerCase().includes(s)
      );
    });
  }, [items, q, filterSt]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  async function loadItems() {
    try {
      const res = await adminService.getPayments(filterSt);
      setItems(res.data?.items || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        await loadItems();
      } finally {
        if (alive) setLoading(false);
      }
    }
    init();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSt]);

  async function refresh() {
    setLoading(true);
    await loadItems();
    setLoading(false);
  }

  function openDetail(p) {
    setDetail(p);
    setDetailOpen(true);
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Payments
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-72">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tx_id, email, bk_id..."
              />
            </div>
            <Select value={filterSt} onChange={(e) => setFilterSt(e.target.value)}>
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </Select>
          </div>
        </div>

        <PaymentsTable
          pagedItems={pagedItems}
          filtered={filtered}
          openDetail={openDetail}
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} />
      </div>

      <PaymentDetailModal
        detailOpen={detailOpen}
        setDetailOpen={setDetailOpen}
        detail={detail}
      />
    </AdminShell>
  );
}
