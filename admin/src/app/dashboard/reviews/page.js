"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RipleLoading from "@/components/loading/RipleLoading";
import AdminPagination from "@/components/admin/AdminPagination";

import ReviewsTable from "@/components/admin/reviews/ReviewsTable";
import ReviewDetailModal from "@/components/admin/reviews/ReviewDetailModal";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

const VIS = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" },
];

const PAGE_SIZE = 10;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [vis, setVis] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const [view, setView] = useState(null);
  const [confirm, setConfirm] = useState({
    open: false,
    kind: null,
    item: null,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) => {
      return (
        String(r.id || "").includes(s) ||
        (r.user?.email || "").toLowerCase().includes(s) ||
        (r.listing?.title || "").toLowerCase().includes(s) ||
        String(r.booking_id || "").includes(s)
      );
    });
  }, [items, q]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [q, vis]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  async function loadItems() {
    try {
      const res = await adminService.getReviews(vis);
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
  }, [vis]);

  async function refresh() {
    setLoading(true);
    await loadItems();
    setLoading(false);
  }

  async function hideReview(id) {
    setBusyId(id);
    try {
      await adminService.hideReview(id);
      await loadItems();
    } finally {
      setBusyId(null);
    }
  }

  async function unhideReview(id) {
    setBusyId(id);
    try {
      await adminService.unhideReview(id);
      await loadItems();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReview(id) {
    setBusyId(id);
    try {
      await adminService.deleteReview(id);
      await loadItems();
    } finally {
      setBusyId(null);
    }
  }

  async function onBulkHide() {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      await adminService.bulkHideReviews(selectedIds);
      toast.success(`Hidden ${selectedIds.length} reviews`);
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Bulk hide failed");
    } finally {
      setSaving(false);
    }
  }

  async function onBulkUnhide() {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      await adminService.bulkUnhideReviews(selectedIds);
      toast.success(`Unhidden ${selectedIds.length} reviews`);
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Bulk unhide failed");
    } finally {
      setSaving(false);
    }
  }

  async function onBulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm("Are you sure you want to delete these reviews?")) return;
    setSaving(true);
    try {
      await adminService.bulkDeleteReviews(selectedIds);
      toast.success(`Deleted ${selectedIds.length} reviews`);
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Bulk delete failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-72">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search id / user / listing..."
              />
            </div>
            <Select value={vis} onChange={(e) => setVis(e.target.value)}>
              {VIS.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <ReviewsTable
          pagedItems={pagedItems}
          filtered={filtered}
          setView={setView}
          unhideReview={unhideReview}
          hideReview={hideReview}
          setConfirm={setConfirm}
          busyId={busyId}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} />
      </div>

      <ReviewDetailModal view={view} setView={setView} />

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, kind: null, item: null })}
        title="Delete review?"
        description={
          confirm.item
            ? `#${confirm.item.id} • ${confirm.item.user?.email || ""}`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={busyId === confirm.item?.id}
        onConfirm={async () => {
          const it = confirm.item;
          setConfirm({ open: false, kind: null, item: null });
          if (it) await deleteReview(it.id);
        }}
      />

      {/* Floating Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
          <div className="flex items-center gap-5 px-8 py-5 rounded-[40px] border ui-border glass shadow-lg ring-1 ring-white/10">
            <div className="flex flex-col">
              <span className="text-sm font-bold ui-fg">{selectedIds.length} Selected</span>
              <span className="text-[10px] ui-muted uppercase font-bold tracking-widest">Reviews</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onBulkHide} disabled={saving}>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide
              </Button>
              <Button variant="secondary" size="sm" onClick={onBulkUnhide} disabled={saving}>
                <Eye className="w-4 h-4 mr-2" />
                Unhide
              </Button>
              <Button variant="danger" size="sm" onClick={onBulkDelete} disabled={saving}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
