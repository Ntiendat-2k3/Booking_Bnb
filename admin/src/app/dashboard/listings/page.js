"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AdminShell from "@/components/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RipleLoading from "@/components/loading/RipleLoading";
import AdminPagination from "@/components/admin/AdminPagination";

import ListingsTable from "@/components/admin/listings/ListingsTable";
import ListingDetailModal from "@/components/admin/listings/ListingDetailModal";
import ListingActionModals from "@/components/admin/listings/ListingActionModals";
import { CheckCircle2, XCircle, CheckSquare } from "lucide-react";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "published", label: "Đang hiển thị" },
  { key: "paused", label: "Tạm dừng" },
  { key: "draft", label: "Draft" },
  { key: "rejected", label: "Bị từ chối" },
];

const PAGE_SIZE = 10;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [view, setView] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("Nội dung chưa đạt yêu cầu");

  const [confirm, setConfirm] = useState({
    open: false,
    kind: null,
    item: null,
  });
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = useMemo(() => {
    let base = items;
    if (tab !== "all") base = base.filter((x) => x.status === tab);
    const s = q.trim().toLowerCase();
    if (!s) return base;
    return base.filter((x) => {
      return (
        (x.title || "").toLowerCase().includes(s) ||
        (x.city || "").toLowerCase().includes(s) ||
        (x.host?.email || "").toLowerCase().includes(s) ||
        (x.host?.full_name || "").toLowerCase().includes(s) ||
        String(x.id || "").includes(s)
      );
    });
  }, [items, tab, q]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [tab, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  async function loadItems() {
    try {
      const res = await adminService.getListings();
      setItems(res.data?.items || []);
    } catch (e) {
      toast.error(e?.message || "Lỗi tải listings");
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
  }, []);

  async function refresh() {
    setLoading(true);
    await loadItems();
    setSelectedIds([]);
    setLoading(false);
  }

  async function onBulkApprove() {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      const res = await adminService.bulkApproveListings(selectedIds);
      const success = res.data?.results?.filter((r) => r.status === "success") || [];
      toast.success(`Processed ${success.length}/${selectedIds.length} approvals`);
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Bulk action failed");
    } finally {
      setSaving(false);
    }
  }

  async function onBulkReject(reason = "Batch reject") {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      const res = await adminService.bulkRejectListings(selectedIds, reason);
      const success = res.data?.results?.filter((r) => r.status === "success") || [];
      toast.success(`Processed ${success.length}/${selectedIds.length} rejections`);
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Bulk action failed");
    } finally {
      setSaving(false);
    }
  }

  async function approve(id) {
    setSaving(true);
    try {
      await adminService.approveListing(id);
      toast.success("Listing approved");
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Approve failed");
    } finally {
      setSaving(false);
    }
  }

  async function reject(id, reason) {
    setSaving(true);
    try {
      await adminService.rejectListing(id, reason);
      toast.success("Listing rejected");
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Reject failed");
    } finally {
      setSaving(false);
    }
  }

  function openReject(item) {
    setRejectTarget(item);
    setRejectReason(item?.reject_reason || "Nội dung chưa đạt yêu cầu");
    setRejectOpen(true);
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Listings moderation
            </h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-80">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search id/title/city/host..."
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={tab === t.key ? "primary" : "secondary"}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <ListingsTable
          filtered={filtered}
          pagedItems={pagedItems}
          saving={saving}
          setView={setView}
          setConfirm={setConfirm}
          openReject={openReject}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} />
      </div>

      <ListingDetailModal view={view} setView={setView} />

      <ListingActionModals
        rejectOpen={rejectOpen}
        setRejectOpen={setRejectOpen}
        rejectTarget={rejectTarget}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        reject={reject}
        saving={saving}
        confirm={confirm}
        setConfirm={setConfirm}
        approve={approve}
      />

      {/* Floating Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
          <div className="flex items-center gap-5 px-8 py-5 rounded-[40px] border ui-border glass shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/10">
            <div className="flex flex-col">
              <span className="text-sm font-black text-white">{selectedIds.length} Selected</span>
              <span className="text-[10px] ui-muted font-bold tracking-widest uppercase">Moderation Mode</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex gap-3">
              <Button 
                variant="success" 
                className="rounded-full px-6 brand-shadow"
                onClick={onBulkApprove} 
                disabled={saving}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button 
                variant="danger" 
                className="rounded-full px-6"
                onClick={() => onBulkReject("Bulk rejected by system admin")} 
                disabled={saving}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button 
                variant="ghost" 
                className="rounded-full hover:bg-white/10"
                onClick={() => setSelectedIds([])} 
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
