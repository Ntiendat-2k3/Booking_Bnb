"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/templates/AdminShell";
import { adminService } from "@/services/adminService";
import Input from "@/components/atoms/Input";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import { toast } from "sonner";
import RipleLoading from "@/components/atoms/RipleLoading";
import AdminPagination from "@/components/molecules/AdminPagination";
import AdminPageHeader from "@/components/molecules/AdminPageHeader";
import StatCard from "@/components/molecules/StatCard";
import { Users, UserRound, House, Shield, Search } from "lucide-react";

import UsersTable from "@/components/organisms/users/UsersTable";
import UserDetailModal from "@/components/organisms/users/UserDetailModal";
import UserRoleModal from "@/components/organisms/users/UserRoleModal";
import useDebouncedValue from "@/hooks/useDebouncedValue";

const PAGE_SIZE = 10;

export default function Page() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1, roles: {} });
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const [page, setPage] = useState(1);

  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState("guest");
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = items;

  useEffect(() => {
    setPage(1);
  }, [q]);

  const pageCount = Math.max(1, meta.total_pages);
  const pagedItems = items;

  const loadItems = useCallback(async (signal) => {
    try {
      const res = await adminService.getUsers({ q: debouncedQ, page, limit: PAGE_SIZE, signal });
      if (!signal?.aborted) {
        setItems(res.data?.items || []);
        setMeta(res.data?.meta || { total: 0, total_pages: 1, roles: {} });
        if (page > (res.data?.meta?.total_pages || 1)) setPage(Math.max(1, res.data.meta.total_pages));
      }
    } catch (e) {
      if (!signal?.aborted && e?.name !== "AbortError") toast.error(e?.message || t("common.loadFailed", { item: t("nav.users") }));
    }
  }, [debouncedQ, page, t]);

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
      toast.success(t("users.roleUpdated"));
      setEditUser(null);
      await refresh();
    } catch (e) {
      const msg = e?.message || t("common.updateFailed");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <AdminPageHeader icon={Users} title={t("nav.users")} description={t("ui.usersDescription")}>
          <label className="admin-search"><Search size={18} aria-hidden="true" /><Input aria-label={t("users.search")} value={q} maxLength={255} onChange={(e) => setQ(e.target.value)} placeholder={t("users.search")} /></label>
        </AdminPageHeader>

        <div className="admin-stats">
          <StatCard icon={Users} label={t("ui.totalUsers")} value={meta.total} />
          <StatCard icon={UserRound} label={t("ui.guests")} value={meta.roles?.guest || 0} />
          <StatCard icon={House} label={t("ui.hosts")} value={meta.roles?.host || 0} />
          <StatCard icon={Shield} label={t("ui.admins")} value={meta.roles?.admin || 0} tone="amber" />
        </div>
        {q.trim() ? <p className="text-xs ui-muted">{t("ui.filteredMetrics")}</p> : null}

        <UsersTable 
          pagedItems={pagedItems} 
          filtered={filtered} 
          setViewUser={setViewUser} 
          openEdit={openEdit} 
        />

        <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} total={meta.total} itemLabel={t("nav.users")} />
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
        title={t("users.promoteTitle")}
        description={t("users.promoteDescription")}
        confirmText={t("users.promoteConfirm")}
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
