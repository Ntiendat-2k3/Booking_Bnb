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
import { Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import RipleLoading from "@/components/loading/RipleLoading";

const ROLE_OPTIONS = ["guest", "host", "admin"];

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState("guest");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((u) => {
      return (
        (u.email || "").toLowerCase().includes(s) ||
        (u.full_name || "").toLowerCase().includes(s) ||
        (u.role || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function loadItems() {
    const res = await apiFetch(`/api/v1/admin/users`, { method: "GET" });
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
  }, [router]);

  async function refresh() {
    setLoading(true);
    try {
      await loadItems();
    } finally {
      setLoading(false);
    }
  }

  function openEdit(u) {
    setEditUser(u);
    setEditRole(u.role || "guest");
  }

  async function saveRole() {
    if (!editUser) return;
    setSaving(true);
    setActionError("");
    try {
      await apiFetch(`/api/v1/admin/users/${editUser.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: editRole }),
      });
      toast.success("Role updated");
      setEditUser(null);
      await refresh();
    } catch (e) {
      const msg = e?.message || "Update failed";
      setActionError(msg);
      toast.error(msg);
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
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-80">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name/email/role..."
              />
            </div>
            <Button onClick={refresh} variant="secondary">
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-hidden border shadow-sm rounded-2xl ui-border ui-panel">
          <table className="w-full text-sm">
            <thead className="text-left bg-white/5 ui-muted">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Full name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t ui-border hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium ui-fg">{u.email}</div>
                    <div className="mt-0.5 text-xs ui-muted font-mono">
                      ID: {u.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.full_name || <span className="ui-muted-2">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        u.role === "admin"
                          ? "zinc"
                          : u.role === "host"
                            ? "emerald"
                            : "slate"
                      }
                    >
                      {u.role || "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setViewUser(u)}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="w-4 h-4" />
                        Edit role
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="px-4 py-10 text-center ui-muted" colSpan={4}>
                    Không có user.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!viewUser}
        onClose={() => setViewUser(null)}
        title="User information"
        description={viewUser ? viewUser.email : ""}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setViewUser(null)}>
            Close
          </Button>
        }
      >
        {viewUser ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-2xl ui-border">
              <div className="text-sm font-semibold">Profile</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">Full name:</span>{" "}
                  {viewUser.full_name || "—"}
                </div>
                <div>
                  <span className="ui-muted">Role:</span>{" "}
                  <Badge
                    tone={
                      viewUser.role === "admin"
                        ? "zinc"
                        : viewUser.role === "host"
                          ? "emerald"
                          : "slate"
                    }
                  >
                    {viewUser.role || "—"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border">
              <div className="text-sm font-semibold">Identifiers</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">User ID:</span>{" "}
                  <span className="font-mono text-xs">{viewUser.id}</span>
                </div>
                <div>
                  <span className="ui-muted">Email:</span> {viewUser.email}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!editUser}
        onClose={() => {
          if (!saving) setEditUser(null);
        }}
        title="Edit user role"
        description={editUser ? `User: ${editUser.email}` : ""}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditUser(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant={editRole === "admin" ? "danger" : "primary"}
              onClick={() => {
                if (editRole === "admin") setConfirmOpen(true);
                else saveRole();
              }}
              disabled={saving}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm ui-muted">
            Chọn role mới cho user. (Chuyển lên{" "}
            <span className="font-semibold">admin</span> sẽ mở toàn quyền quản
            trị.)
          </div>
          <Select
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Promote to admin?"
        description="Bạn chắc chắn muốn set role = admin? Quyền admin sẽ truy cập toàn bộ trang quản trị."
        confirmText="Yes, set admin"
        cancelText="Cancel"
        danger
        loading={saving}
        onConfirm={async () => {
          setConfirmOpen(false);
          await saveRole();
        }}
      />
    </AdminShell>
  );
}
