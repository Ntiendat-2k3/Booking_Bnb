"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import RipleLoading from "@/components/loading/RipleLoading";
import AdminPagination from "@/components/admin/AdminPagination";

import AmenitiesTable from "@/components/admin/amenities/AmenitiesTable";
import AmenityCreateModal from "@/components/admin/amenities/AmenityCreateModal";
import AmenityEditModal from "@/components/admin/amenities/AmenityEditModal";

const PAGE_SIZE = 10;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    group: "",
    is_active: true,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null); // amenity object
  const [editForm, setEditForm] = useState({
    name: "",
    group: "",
    is_active: true,
  });

  const [confirm, setConfirm] = useState({ open: false, item: null });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let base = items;
    if (activeFilter !== "all") {
      const wantActive = activeFilter === "active";
      base = base.filter((a) => (a.is_active !== false) === wantActive);
    }
    if (!s) return base;
    return base.filter((a) => {
      return (
        (a.name || "").toLowerCase().includes(s) ||
        (a.slug || "").toLowerCase().includes(s) ||
        (a.group || "").toLowerCase().includes(s)
      );
    });
  }, [items, q, activeFilter]);

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
      const res = await adminService.getAmenities(activeFilter);
      setItems(res.data?.items || []);
    } catch (e) {
      toast.error(e?.message || "Lỗi tải amenities");
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
  }, [activeFilter]);

  async function refresh() {
    setLoading(true);
    await loadItems();
    setLoading(false);
  }

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
      toast.success("Amenity created");
      setCreateOpen(false);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Create failed");
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
      toast.success("Amenity updated");
      setEditOpen(false);
      setEditing(null);
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a) {
    const next = !(a.is_active !== false);
    setSaving(true);
    try {
      await adminService.toggleAmenityActive(a.id, next);
      toast.success(next ? "Activated" : "Deactivated");
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Action failed");
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
            <h1 className="text-2xl font-semibold tracking-tight">Amenities</h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-72">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name / slug / group..."
              />
            </div>
            <Select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Button onClick={() => setCreateOpen(true)} variant="primary">
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>
        </div>

        <AmenitiesTable
          pagedItems={pagedItems}
          filtered={filtered}
          openEdit={openEdit}
          setConfirm={setConfirm}
          saving={saving}
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} />
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
            ? "Deactivate amenity?"
            : "Activate amenity?"
        }
        description={
          confirm.item ? `${confirm.item.name} (${confirm.item.slug})` : ""
        }
        confirmText={
          confirm.item?.is_active !== false ? "Deactivate" : "Activate"
        }
        cancelText="Cancel"
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
