"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";

const ROLE_OPTIONS = ["guest", "host", "admin"];

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

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

  async function changeRole(userId, role) {
    await apiFetch(`/api/v1/admin/users/${userId}/role`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    await refresh();
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <AdminShell>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-2 text-zinc-600">
            Quản lý người dùng và role (guest → host → admin).
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name/email/role..."
          className="w-full rounded-xl border bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-600">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Full name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.full_name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => changeRole(u.id, r)}
                        disabled={u.role === r}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                          u.role === r
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white hover:bg-zinc-50"
                        }`}
                      >
                        Set {r}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="px-4 py-6 text-zinc-600" colSpan={4}>
                  Không có user.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
