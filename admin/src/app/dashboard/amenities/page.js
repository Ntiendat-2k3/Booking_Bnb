"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/templates/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Select from "@/components/atoms/Select";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import { Plus, Sparkles, Package, Play, Pause, Star, Search } from "lucide-react";
import { toast } from "sonner";
import RipleLoading from "@/components/atoms/RipleLoading";
import AdminPagination from "@/components/molecules/AdminPagination";
import AdminPageHeader from "@/components/molecules/AdminPageHeader";
import StatCard from "@/components/molecules/StatCard";

import AmenitiesTable from "@/components/organisms/amenities/AmenitiesTable";
import AmenityCreateModal from "@/components/organisms/amenities/AmenityCreateModal";
import AmenityEditModal from "@/components/organisms/amenities/AmenityEditModal";
import useDebouncedValue from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 10;

export default function Page() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1, summary: {}, groups: [] });
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    group: "",
    is_active: true,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    group: "",
    is_active: true,
  });

  const [confirm, setConfirm] = useState({ open: false, item: null });
  const [saving, setSaving] = useState(false);

  const filtered = items;

  useEffect(() => {
    setPage(1);
  }, [q, groupFilter, activeFilter]);

  const pageCount = Math.max(1, meta.total_pages);
  const pagedItems = items;

  const loadItems = useCallback(async (signal) => {
    try {
      const res = await adminService.getAmenities({ active: activeFilter, group: groupFilter, q: debouncedQ, page, limit: PAGE_SIZE, signal });
      if (!signal?.aborted) {
        setItems(res.data?.items || []);
        setMeta(res.data?.meta || { total: 0, total_pages: 1, summary: {}, groups: [] });
        if (page > (res.data?.meta?.total_pages || 1)) setPage(Math.max(1, res.data.meta.total_pages));
      }
    } catch (e) {
      if (!signal?.aborted && e?.name !== "AbortError") toast.error(e?.message || t("common.loadFailed", { item: t("nav.amenities") }));
    }
  }, [activeFilter, groupFilter, debouncedQ, page, t]);

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

  async function onCreate() {
    if (!createForm.name.trim()) return;
    setSaving(true);
    try {
      await adminService.createAmenity({
        name: createForm.name.trim(),
        group: createForm.group.trim() || null,
        is_active: createForm.is_active === true,
      });
      setCreateForm({ name: "", group: "", is_active: true });
      toast.success(t("amenities.created"));
      setCreateOpen(false);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("common.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(a) {
    setEditing(a);
    setEditForm({
      name: a.name || "",
      group: a.group || "",
      is_active: a.is_active !== false,
    });
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await adminService.updateAmenity(editing.id, {
        name: editForm.name.trim(),
        group: editForm.group.trim() || null,
        is_active: editForm.is_active === true,
      });
      toast.success(t("amenities.updated"));
      setEditOpen(false);
      setEditing(null);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("common.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a) {
    const next = !(a.is_active !== false);
    setSaving(true);
    try {
      await adminService.toggleAmenityActive(a.id, next);
      toast.success(t(next ? "amenities.activated" : "amenities.deactivated"));
      await loadItems();
    } catch (e) {
      toast.error(e?.message || t("common.actionFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <AdminPageHeader icon={Sparkles} title={t("nav.amenities")} description={t("ui.amenitiesDescription")}>
          <label className="admin-search"><Search size={18} aria-hidden="true" /><Input aria-label={t("amenities.search")} value={q} maxLength={255} onChange={(e) => setQ(e.target.value)} placeholder={t("amenities.search")} /></label>
          <Select aria-label={t("common.group")} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="all">{t("ui.allGroups")}</option>
            {(meta.groups || []).map((group) => <option key={group} value={group}>{group}</option>)}
          </Select>
          <Select aria-label={t("common.status")} value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="all">{t("common.all")}</option>
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("common.inactive")}</option>
          </Select>
          <Button onClick={() => setCreateOpen(true)} variant="primary"><Plus className="w-4 h-4" />{t("common.new")}</Button>
        </AdminPageHeader>

        <div className="admin-stats">
          <StatCard icon={Package} label={t("ui.totalAmenities")} value={meta.total} />
          <StatCard icon={Play} label={t("ui.activeAmenities")} value={meta.summary?.active || 0} />
          <StatCard icon={Pause} label={t("ui.inactiveAmenities")} value={meta.summary?.inactive || 0} tone="red" />
          <StatCard icon={Star} label={t("ui.mostUsed")} value={meta.summary?.mostUsed || 0} tone="amber" />
        </div>
        {q.trim() || activeFilter !== "all" || groupFilter !== "all" ? <p className="text-xs ui-muted">{t("ui.filteredMetrics")}</p> : null}

        <AmenitiesTable
          pagedItems={pagedItems}
          filtered={filtered}
          openEdit={openEdit}
          setConfirm={setConfirm}
          saving={saving}
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} total={meta.total} itemLabel={t("nav.amenities")} />
      </div>

      <AmenityCreateModal
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        saving={saving}
        createForm={createForm}
        setCreateForm={setCreateForm}
        onCreate={onCreate}
      />

      <AmenityEditModal
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        saving={saving}
        editing={editing}
        editForm={editForm}
        setEditForm={setEditForm}
        onSaveEdit={onSaveEdit}
      />

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, item: null })}
        title={
          confirm.item?.is_active !== false
            ? t("amenities.deactivateTitle")
            : t("amenities.activateTitle")
        }
        description={
          confirm.item ? `${confirm.item.name} (${confirm.item.slug})` : ""
        }
        confirmText={
          confirm.item?.is_active !== false ? t("common.deactivate") : t("common.activate")
        }
        danger={confirm.item?.is_active !== false}
        loading={saving}
        onConfirm={async () => {
          const a = confirm.item;
          setConfirm({ open: false, item: null });
          if (a) await toggleActive(a);
        }}
      />
    </AdminShell>
  );
}
