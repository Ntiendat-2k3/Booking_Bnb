"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AdminShell from "@/components/templates/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import RipleLoading from "@/components/atoms/RipleLoading";
import AdminPagination from "@/components/molecules/AdminPagination";
import AdminPageHeader from "@/components/molecules/AdminPageHeader";

import ListingsTable from "@/components/organisms/listings/ListingsTable";
import ListingDetailModal from "@/components/organisms/listings/ListingDetailModal";
import ListingActionModals from "@/components/organisms/listings/ListingActionModals";
import { XCircle, CheckSquare, House, Search } from "lucide-react";
import useDebouncedValue from "@/hooks/useDebouncedValue";

const TABS = ["all", "pending", "published", "paused", "draft", "rejected"];

const PAGE_SIZE = 10;

export default function Page() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1, statuses: {} });
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const [page, setPage] = useState(1);

  const [view, setView] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [confirm, setConfirm] = useState({
    open: false,
    kind: null,
    item: null,
  });
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = items;

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [tab, q]);

  useEffect(() => {
    setSelectedIds([]);
  }, [page]);

  const pageCount = Math.max(1, meta.total_pages);
  const pagedItems = items;

  const loadItems = useCallback(async (signal) => {
    try {
      const res = await adminService.getListings({ status: tab, q: debouncedQ, page, limit: PAGE_SIZE, signal });
      if (!signal?.aborted) {
        setItems(res.data?.items || []);
        setMeta(res.data?.meta || { total: 0, total_pages: 1, statuses: {} });
        if (page > (res.data?.meta?.total_pages || 1)) setPage(Math.max(1, res.data.meta.total_pages));
      }
    } catch (e) {
      if (!signal?.aborted && e?.name !== "AbortError") toast.error(e?.message || t("common.loadFailed", { item: t("nav.listings") }));
    }
  }, [tab, debouncedQ, page, t]);

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
      const results = res.data?.results || [];
      const success = results.filter((r) => r.status === "success");
      const failure = results.find((r) => r.status !== "success");
      const message = t("listings.processedApprovals", { count: success.length, total: selectedIds.length });
      if (success.length === selectedIds.length) toast.success(message);
      else toast.error(message, { description: failure?.message || t("common.bulkFailed") });
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("common.bulkFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onBulkReject() {
    if (!selectedIds.length) return;
    setSaving(true);
    try {
      const res = await adminService.bulkRejectListings(selectedIds, t("listings.bulkRejectReason"));
      const results = res.data?.results || [];
      const success = results.filter((r) => r.status === "success");
      const failure = results.find((r) => r.status !== "success");
      const message = t("listings.processedRejections", { count: success.length, total: selectedIds.length });
      if (success.length === selectedIds.length) toast.success(message);
      else toast.error(message, { description: failure?.message || t("common.bulkFailed") });
      setSelectedIds([]);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("common.bulkFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function approve(id) {
    setSaving(true);
    try {
      await adminService.approveListing(id);
      toast.success(t("listings.approved"));
      await refresh();
    } catch (e) {
      toast.error(e?.message || t("listings.approveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function reject(id, reason) {
    setSaving(true);
    try {
      await adminService.rejectListing(id, reason);
      toast.success(t("listings.rejected"));
      await refresh();
    } catch (e) {
      toast.error(e?.message || t("listings.rejectFailed"));
    } finally {
      setSaving(false);
    }
  }

  function openReject(item) {
    setRejectTarget(item);
    setRejectReason(item?.reject_reason || t("listings.defaultRejectReason"));
    setRejectOpen(true);
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <AdminPageHeader icon={House} title={t("listings.moderation")} description={t("ui.listingsDescription")}>
          <label className="admin-search"><Search size={18} aria-hidden="true" /><Input aria-label={t("listings.search")} value={q} maxLength={255} onChange={(e) => setQ(e.target.value)} placeholder={t("listings.search")} /></label>
        </AdminPageHeader>

        <div className="flex flex-wrap gap-2">
          {TABS.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={tab === status ? "primary" : "secondary"}
              className="rounded-full"
              onClick={() => setTab(status)}
            >
              {t(`statuses.${status}`)} <span className="ml-1 opacity-70">{status === "all" ? Object.values(meta.statuses || {}).reduce((sum, count) => sum + count, 0) : (meta.statuses?.[status] || 0)}</span>
            </Button>
          ))}
        </div>
        {q.trim() ? <p className="text-xs ui-muted">{t("ui.filteredMetrics")}</p> : null}

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

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} total={meta.total} itemLabel={t("nav.listings")} />
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

      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
          <div className="flex items-center gap-5 px-8 py-5 border ui-border glass shadow-[0_20px_50px_rgba(0,0,0,0.4)] ring-1 ring-white/10">
            <div className="flex flex-col">
              <span className="text-sm font-black ui-fg">{t("common.selected", { count: selectedIds.length })}</span>
              <span className="text-[10px] ui-muted font-bold tracking-widest uppercase">{t("listings.moderationMode")}</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex gap-3">
              <Button 
                variant="success" 
                className="px-6 brand-shadow"
                onClick={onBulkApprove} 
                disabled={saving}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                {t("common.approve")}
              </Button>
              <Button 
                variant="danger" 
                className="px-6"
                onClick={onBulkReject}
                disabled={saving}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t("common.reject")}
              </Button>
              <Button 
                variant="ghost" 
                className="hover:bg-white/10"
                onClick={() => setSelectedIds([])} 
                disabled={saving}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
