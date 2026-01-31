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
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RipleLoading from "@/components/loading/RipleLoading";
import AdminPagination from "@/components/admin/AdminPagination";

const VIS = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" },
];

function Stars({ rating }) {
  const n = Math.max(0, Math.min(5, Number(rating || 0)));
  return (
    <div className="text-sm">
      <span className="ui-fg">{"★★★★★".slice(0, n)}</span>
      <span className="text-zinc-300">{"★★★★★".slice(0, 5 - n)}</span>
      <span className="ml-2 text-xs ui-muted">{n}/5</span>
    </div>
  );
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

const PAGE_SIZE = 10;


export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [vis, setVis] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const [view, setView] = useState(null);
  const [confirm, setConfirm] = useState({
    open: false,
    kind: null,
    item: null,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) => {
      return (
        String(r.id || "").includes(s) ||
        (r.user?.email || "").toLowerCase().includes(s) ||
        (r.listing?.title || "").toLowerCase().includes(s) ||
        String(r.booking_id || "").includes(s)
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
    const res = await apiFetch(`/api/v1/admin/reviews?visibility=${vis}`, {
      method: "GET",
    });
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
  }, [router, vis]);

  async function refresh() {
    setLoading(true);
    try {
      await loadItems();
    } finally {
      setLoading(false);
    }
  }

  async function hideReview(id) {
    setBusyId(id);
    try {
      await apiFetch(`/api/v1/admin/reviews/${id}/hide`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadItems();
    } finally {
      setBusyId(null);
    }
  }

  async function unhideReview(id) {
    setBusyId(id);
    try {
      await apiFetch(`/api/v1/admin/reviews/${id}/unhide`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadItems();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReview(id) {
    setBusyId(id);
    try {
      await apiFetch(`/api/v1/admin/reviews/${id}`, { method: "DELETE" });
      await loadItems();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-72">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search id / user / listing..."
              />
            </div>
            <Select value={vis} onChange={(e) => setVis(e.target.value)}>
              {VIS.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label}
                </option>
              ))}
            </Select>
            <Button onClick={refresh} variant="secondary">
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-hidden border shadow-sm rounded-2xl ui-border ui-panel">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 ui-muted">
              <tr>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((r) => (
                <tr key={r.id} className="border-t ui-border hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs ui-muted">#{r.id}</div>
                    <div className="mt-0.5 text-xs ui-muted font-mono">
                      booking: {r.booking_id ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium ui-fg">
                      {r.listing?.title || "—"}
                    </div>
                    <div className="mt-0.5 text-xs ui-muted font-mono">
                      LID: {r.listing?.id || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium ui-fg">
                      {r.user?.email || "—"}
                    </div>
                    <div className="mt-0.5 text-xs ui-muted font-mono">
                      UID: {r.user?.id || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Stars rating={r.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={r.is_hidden ? "rose" : "emerald"}>
                      {r.is_hidden ? "hidden" : "visible"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setView(r)}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>

                      {r.is_hidden ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => unhideReview(r.id)}
                          disabled={busyId === r.id}
                        >
                          <Eye className="w-4 h-4" />
                          Unhide
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => hideReview(r.id)}
                          disabled={busyId === r.id}
                        >
                          <EyeOff className="w-4 h-4" />
                          Hide
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          setConfirm({ open: true, kind: "delete", item: r })
                        }
                        disabled={busyId === r.id}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="px-4 py-10 text-center ui-muted" colSpan={7}>
                    Không có review.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

          <AdminPagination pageCount={pageCount} page={page} onPageChange={setPage} />
      </div>

      <Modal
        open={!!view}
        onClose={() => setView(null)}
        title="Review detail"
        description={view ? `#${view.id}` : ""}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setView(null)}>
            Close
          </Button>
        }
      >
        {view ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-2xl ui-border">
              <div className="text-sm font-semibold">Meta</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">Rating:</span>{" "}
                  <Stars rating={view.rating} />
                </div>
                <div>
                  <span className="ui-muted">Visibility:</span>{" "}
                  <Badge tone={view.is_hidden ? "rose" : "emerald"}>
                    {view.is_hidden ? "hidden" : "visible"}
                  </Badge>
                </div>
                <div>
                  <span className="ui-muted">Created:</span>{" "}
                  {fmtDate(view.created_at)}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border">
              <div className="text-sm font-semibold">User / Listing</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">User:</span>{" "}
                  {view.user?.email || "—"}{" "}
                  <span className="font-mono text-xs ui-muted">
                    ({view.user?.id || "—"})
                  </span>
                </div>
                <div>
                  <span className="ui-muted">Listing:</span>{" "}
                  {view.listing?.title || "—"}{" "}
                  <span className="font-mono text-xs ui-muted">
                    ({view.listing?.id || "—"})
                  </span>
                </div>
                <div>
                  <span className="ui-muted">Booking:</span>{" "}
                  <span className="font-mono text-xs">
                    {view.booking_id ?? "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border md:col-span-2">
              <div className="text-sm font-semibold">Comment</div>
              <div className="p-4 mt-2 text-sm whitespace-pre-wrap rounded-xl bg-white/5 ui-muted">
                {view.comment || "—"}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, kind: null, item: null })}
        title="Delete review?"
        description={
          confirm.item
            ? `#${confirm.item.id} • ${confirm.item.user?.email || ""}`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={busyId === confirm.item?.id}
        onConfirm={async () => {
          const it = confirm.item;
          setConfirm({ open: false, kind: null, item: null });
          if (it) await deleteReview(it.id);
        }}
      />
    </AdminShell>
  );
}
