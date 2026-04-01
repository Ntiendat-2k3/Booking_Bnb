"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { adminService } from "@/services/adminService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import RipleLoading from "@/components/loading/RipleLoading";
import AdminPagination from "@/components/admin/AdminPagination";

import UsersTable from "@/components/admin/users/UsersTable";
import UserDetailModal from "@/components/admin/users/UserDetailModal";
import UserRoleModal from "@/components/admin/users/UserRoleModal";

const PAGE_SIZE = 10;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState("guest");
  const [saving, setSaving] = useState(false);

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
      const res = await adminService.getUsers();
      setItems(res.data?.items || []);
    } catch (e) {
      toast.error(e?.message || "Lỗi tải users");
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
    setLoading(false);
  }

  function openEdit(u) {
    setEditUser(u);
    setEditRole(u.role || "guest");
  }

  async function saveRole() {
    if (!editUser) return;
    setSaving(true);
    try {
      await adminService.updateUserRole(editUser.id, editRole);
      toast.success("Role updated");
      setEditUser(null);
      await refresh();
    } catch (e) {
      const msg = e?.message || "Update failed";
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
          </div>
        </div>

        <UsersTable 
          pagedItems={pagedItems} 
          filtered={filtered} 
          setViewUser={setViewUser} 
          openEdit={openEdit} 
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} />
      </div>

      <UserDetailModal viewUser={viewUser} setViewUser={setViewUser} />

      <UserRoleModal 
        editUser={editUser}
        setEditUser={setEditUser}
        editRole={editRole}
        setEditRole={setEditRole}
        saving={saving}
        setConfirmOpen={setConfirmOpen}
        saveRole={saveRole}
      />

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
