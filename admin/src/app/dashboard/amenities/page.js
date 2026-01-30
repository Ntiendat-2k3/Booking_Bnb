"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Plus, Pencil, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", group: "", is_active: true });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null); // amenity object
  const [editForm, setEditForm] = useState({ name: "", group: "", is_active: true });

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

  async function loadItems() {
    const res = await apiFetch(`/api/v1/admin/amenities?active=${activeFilter}`, { method: "GET" });
    setItems(res.data?.items || []);
  }

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        await apiFetch("/api/v1/auth/csrf", { method: "GET" });

        try {
          const me = await apiFetch("/api/v1/auth/profile", { method: "GET" });
          if (me.data?.role !== "admin") throw new Error("not admin");
        } catch (e) {
          if (e?.status !== 401) throw e;
          await apiFetch("/api/v1/auth/refresh", {
            method: "POST",
            body: JSON.stringify({}),
          });
          const me2 = await apiFetch("/api/v1/auth/profile", { method: "GET" });
          if (me2.data?.role !== "admin") throw new Error("not admin");
        }

        await loadItems();
      } catch {
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    }

    init();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, activeFilter]);

  async function refresh() {
    setLoading(true);
    try {
      await loadItems();
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    if (!createForm.name.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/v1/admin/amenities", {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          group: createForm.group.trim() || null,
          is_active: createForm.is_active === true,
        }),
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
      await apiFetch(`/api/v1/admin/amenities/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          group: editForm.group.trim() || null,
          is_active: editForm.is_active === true,
        }),
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
      await apiFetch(`/api/v1/admin/amenities/${a.id}/active`, {
        method: "POST",
        body: JSON.stringify({ is_active: next }),
      });
      toast.success(next ? "Activated" : "Deactivated");
      await loadItems();
    } catch (e) {
      toast.error(e?.message || "Action failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

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
            <Select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Button onClick={refresh} variant="secondary">
              Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)} variant="primary">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border ui-border ui-panel shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 ui-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t ui-border hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium ui-fg">{a.name}</div>
                    <div className="mt-0.5 text-xs font-mono ui-muted">ID: {a.id}</div>
                  </td>
                  <td className="px-4 py-3">{a.group || <span className="ui-muted-2">—</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs ui-muted">{a.slug}</td>
                  <td className="px-4 py-3">{a.listing_count ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={a.is_active !== false ? "emerald" : "zinc"}>
                      {a.is_active !== false ? "active" : "inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirm({ open: true, item: a })}
                        disabled={saving}
                      >
                        {a.is_active !== false ? (
                          <>
                            <EyeOff className="h-4 w-4" /> Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" /> Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filtered.length ? (
                <tr>
                  <td className="px-4 py-10 text-center ui-muted" colSpan={6}>
                    Không có amenity.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => {
          if (!saving) toast.success("Amenity created");
      setCreateOpen(false);
        }}
        title="Create amenity"
        description="Tạo tiện ích mới để host chọn khi tạo listing."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onCreate} disabled={saving || !createForm.name.trim()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Name</div>
            <Input
              value={createForm.name}
              onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Wifi, Pool, Kitchen..."
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Group</div>
            <Input
              value={createForm.group}
              onChange={(e) => setCreateForm((s) => ({ ...s, group: e.target.value }))}
              placeholder="Basic / Safety / Bedroom..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm ui-muted">
            <input
              type="checkbox"
              checked={createForm.is_active === true}
              onChange={(e) => setCreateForm((s) => ({ ...s, is_active: e.target.checked }))}
            />
            Active
          </label>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => {
          if (!saving) toast.success("Amenity updated");
      setEditOpen(false);
        }}
        title="Edit amenity"
        description={editing ? `ID: ${editing.id}` : ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onSaveEdit} disabled={saving || !editForm.name.trim()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Name</div>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Name"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Group</div>
            <Input
              value={editForm.group}
              onChange={(e) => setEditForm((s) => ({ ...s, group: e.target.value }))}
              placeholder="Group (optional)"
            />
          </div>
          <label className="flex items-center gap-2 text-sm ui-muted">
            <input
              type="checkbox"
              checked={editForm.is_active === true}
              onChange={(e) => setEditForm((s) => ({ ...s, is_active: e.target.checked }))}
            />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, item: null })}
        title={confirm.item?.is_active !== false ? "Deactivate amenity?" : "Activate amenity?"}
        description={
          confirm.item
            ? `${confirm.item.name} (${confirm.item.slug})`
            : ""
        }
        confirmText={confirm.item?.is_active !== false ? "Deactivate" : "Activate"}
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
