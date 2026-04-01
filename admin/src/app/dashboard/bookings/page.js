"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import RipleLoading from "@/components/loading/RipleLoading";
import AdminPagination from "@/components/admin/AdminPagination";

import BookingsTable from "@/components/admin/bookings/BookingsTable";
import BookingDetailModal from "@/components/admin/bookings/BookingDetailModal";

const STATUS = [
  "all",
  "pending_payment",
  "confirmed",
  "cancelled",
  "completed",
];

const PAGE_SIZE = 10;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(() => {
    let base = items;
    if (status !== "all") base = base.filter((b) => b.status === status);

    const s = q.trim().toLowerCase();
    if (!s) return base;

    return base.filter((b) => {
      return (
        String(b.id || "").includes(s) ||
        String(b.guest?.id || "").includes(s) ||
        String(b.listing?.id || "").includes(s) ||
        (b.guest?.email || "").toLowerCase().includes(s) ||
        (b.listing?.title || "").toLowerCase().includes(s) ||
        (b.status || "").toLowerCase().includes(s)
      );
    });
  }, [items, q, status]);

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  async function loadItems() {
    try {
      const res = await adminService.getBookings(status);
      setItems(res.data?.items || []);
    } catch (e) {
      toast.error(e?.message || "Lỗi tải bookings");
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
  }, [status]);

  async function refresh() {
    setLoading(true);
    await loadItems();
    setLoading(false);
  }

  async function openDetail(id) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await adminService.getBookingDetail(id);
      setDetail(res.data?.booking || null);
    } catch (e) {
      toast.error(e?.message || "Failed to load booking");
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-72">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search id / user / listing..."
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <BookingsTable
          pagedItems={pagedItems}
          filtered={filtered}
          openDetail={openDetail}
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} />
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
