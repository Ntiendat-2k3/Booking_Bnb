"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/templates/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Select from "@/components/atoms/Select";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import RipleLoading from "@/components/atoms/RipleLoading";
import AdminPagination from "@/components/molecules/AdminPagination";
import AdminPageHeader from "@/components/molecules/AdminPageHeader";
import StatCard from "@/components/molecules/StatCard";

import ReviewsTable from "@/components/organisms/reviews/ReviewsTable";
import ReviewDetailModal from "@/components/organisms/reviews/ReviewDetailModal";
import { Eye, EyeOff, Trash2, Star, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import useDebouncedValue from "@/hooks/useDebouncedValue";

const VIS = ["all", "visible", "hidden"];

const PAGE_SIZE = 10;

export default function Page() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1, summary: {} });

  const [vis, setVis] = useState("all");
  const [rating, setRating] = useState("all");
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
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

  const filtered = items;

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [q, vis, rating]);

  useEffect(() => {
    setSelectedIds([]);
  }, [page]);

  const pageCount = Math.max(1, meta.total_pages);
  const pagedItems = items;

  const loadItems = useCallback(async (signal) => {
    try {
      const res = await adminService.getReviews({ visibility: vis, rating, q: debouncedQ, page, limit: PAGE_SIZE, signal });
      if (!signal?.aborted) {
        setItems(res.data?.items || []);
        setMeta(res.data?.meta || { total: 0, total_pages: 1, summary: {} });
        if (page > (res.data?.meta?.total_pages || 1)) setPage(Math.max(1, res.data.meta.total_pages));
      }
    } catch (e) {
      if (!signal?.aborted && e?.name !== "AbortError") toast.error(e?.message || t("common.loadFailed", { item: t("nav.reviews") }));
    }
  }, [vis, rating, debouncedQ, page, t]);

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

  async function hideReview(id) {
    setBusyId(id);
    try {
      await adminService.hideReview(id);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("common.actionFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function unhideReview(id) {
    setBusyId(id);
    try {
      await adminService.unhideReview(id);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("common.actionFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReview(id) {
    setBusyId(id);
    try {
      await adminService.deleteReview(id);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("common.actionFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function onBulkHide() {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      await adminService.bulkHideReviews(selectedIds);
      toast.success(t("reviews.hiddenCount", { count: selectedIds.length }));
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("reviews.bulkHideFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onBulkUnhide() {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      await adminService.bulkUnhideReviews(selectedIds);
      toast.success(t("reviews.unhiddenCount", { count: selectedIds.length }));
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("reviews.bulkUnhideFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onBulkDelete() {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      await adminService.bulkDeleteReviews(selectedIds);
      toast.success(t("reviews.deletedCount", { count: selectedIds.length }));
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("reviews.bulkDeleteFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <AdminPageHeader icon={Star} title={t("nav.reviews")} description={t("ui.reviewsDescription")}>
          <label className="admin-search"><Search size={18} aria-hidden="true" /><Input aria-label={t("reviews.search")} value={q} maxLength={255} onChange={(e) => setQ(e.target.value)} placeholder={t("reviews.search")} /></label>
          <Select aria-label={t("common.rating")} value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="all">{t("ui.allRatings")}</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
          </Select>
          <Select aria-label={t("common.visibility")} value={vis} onChange={(e) => setVis(e.target.value)}>
            {VIS.map((status) => <option key={status} value={status}>{t(`statuses.${status}`)}</option>)}
          </Select>
        </AdminPageHeader>

        <div className="admin-stats">
          <StatCard icon={MessageSquare} label={t("ui.totalReviews")} value={meta.total} />
          <StatCard icon={Star} label={t("ui.fiveStars")} value={meta.summary?.fiveStars || 0} tone="amber" />
          <StatCard icon={Eye} label={t("ui.visibleReviews")} value={meta.summary?.visible || 0} />
          <StatCard icon={EyeOff} label={t("ui.hiddenReviews")} value={meta.summary?.hidden || 0} tone="red" />
        </div>
        {q.trim() || vis !== "all" || rating !== "all" ? <p className="text-xs ui-muted">{t("ui.filteredMetrics")}</p> : null}

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

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} total={meta.total} itemLabel={t("nav.reviews")} />
      </div>

      <ReviewDetailModal view={view} setView={setView} />

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, kind: null, item: null })}
        title={t(confirm.kind === "bulk" ? "reviews.bulkDeleteTitle" : "reviews.deleteTitle")}
        description={
          confirm.kind === "bulk"
            ? t("reviews.bulkDeleteDescription", { count: selectedIds.length })
            : confirm.item
            ? `#${confirm.item.id} • ${confirm.item.reviewer?.email || ""}`
            : ""
        }
        confirmText={t("common.delete")}
        danger
        loading={confirm.kind === "bulk" ? saving : busyId === confirm.item?.id}
        onConfirm={async () => {
          const it = confirm.item;
          const kind = confirm.kind;
          setConfirm({ open: false, kind: null, item: null });
          if (kind === "bulk") await onBulkDelete();
          else if (it) await deleteReview(it.id);
        }}
      />

      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
          <div className="flex items-center gap-5 px-8 py-5 border ui-border glass shadow-lg ring-1 ring-white/10">
            <div className="flex flex-col">
              <span className="text-sm font-bold ui-fg">{t("common.selected", { count: selectedIds.length })}</span>
              <span className="text-[10px] ui-muted uppercase font-bold tracking-widest">{t("nav.reviews")}</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onBulkHide} disabled={saving}>
                <EyeOff className="w-4 h-4 mr-2" />
                {t("common.hide")}
              </Button>
              <Button variant="secondary" size="sm" onClick={onBulkUnhide} disabled={saving}>
                <Eye className="w-4 h-4 mr-2" />
                {t("common.unhide")}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirm({ open: true, kind: "bulk", item: null })} disabled={saving}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t("common.delete")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} disabled={saving}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
