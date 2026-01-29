"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "published", label: "Đang hiển thị" },
  { key: "paused", label: "Tạm dừng" },
  { key: "draft", label: "Draft" },
  { key: "rejected", label: "Bị từ chối" },
];

function Badge({ status }) {
  const map = {
    draft: "bg-slate-100 text-slate-700",
    pending: "bg-amber-100 text-amber-800",
    published: "bg-emerald-100 text-emerald-800",
    paused: "bg-zinc-100 text-zinc-700",
    rejected: "bg-rose-100 text-rose-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        map[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((x) => x.status === tab);
  }, [items, tab]);

  async function loadItems() {
    const res = await apiFetch(`/api/v1/admin/listings`, { method: "GET" });
    setItems(res.data?.items || []);
  }

  useEffect(() => {
    let alive = true;

    async function init() {
      try {
        // Keep loading=true for the whole init (auth + data) to avoid flicker/loop
        await apiFetch("/api/v1/auth/csrf", { method: "GET" });

        // Try profile directly
        try {
          const me = await apiFetch("/api/v1/auth/profile", { method: "GET" });
          if (me.data?.role !== "admin") throw new Error("not admin");
        } catch (e) {
          // If unauthorized -> refresh then retry profile
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

  async function approve(id) {
    await apiFetch(`/api/v1/admin/listings/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await refresh();
  }

  async function reject(id) {
    const reason = window.prompt(
      "Lý do từ chối (optional):",
      "Nội dung chưa đạt yêu cầu"
    );
    await apiFetch(`/api/v1/admin/listings/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    await refresh();
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <AdminShell>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Listings moderation</h1>
          <p className="mt-2 text-zinc-600">
            Host gửi duyệt (pending) → admin duyệt thì chuyển published.
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              tab === t.key ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {filtered.length ? (
          filtered.map((x) => (
            <div key={x.id} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-24 overflow-hidden rounded-xl bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={x.cover_url || "https://picsum.photos/seed/cover/400/300"}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{x.title}</div>
                      <Badge status={x.status} />
                    </div>
                    <div className="text-sm text-zinc-600">
                      {x.city}, {x.country} •{" "}
                      {Number(x.price_per_night || 0).toLocaleString("vi-VN")}₫/đêm •{" "}
                      {x.max_guests} khách
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      UUID: <span className="font-mono">{x.id}</span> • Host:{" "}
                      {x.host?.full_name} ({x.host?.email})
                    </div>
                    {x.reject_reason ? (
                      <div className="mt-1 text-xs text-rose-700">
                        Reject reason: {x.reject_reason}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {x.status === "pending" ? (
                    <>
                      <button
                        onClick={() => approve(x.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(x.id)}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border bg-white p-6 text-zinc-600">
            Không có items.
          </div>
        )}
      </div>
    </AdminShell>
  );
}
