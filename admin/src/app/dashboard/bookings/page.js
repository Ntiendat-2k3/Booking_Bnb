"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Eye } from "lucide-react";
import RipleLoading from "@/components/loading/RipleLoading";

const STATUS = [
  "all",
  "pending_payment",
  "confirmed",
  "cancelled",
  "completed",
];

function statusTone(v) {
  if (v === "confirmed") return "emerald";
  if (v === "completed") return "emerald";
  if (v === "pending_payment") return "amber";
  if (v === "cancelled") return "rose";
  return "slate";
}

function paymentTone(v) {
  if (v === "succeeded") return "emerald";
  if (v === "pending") return "amber";
  if (v === "failed") return "rose";
  if (v === "cancelled") return "rose";
  if (v === "refunded") return "slate";
  return "slate";
}

function money(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return String(v || "");
  return n.toLocaleString();
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(() => {
    let base = items;
    if (status !== "all") base = base.filter((b) => b.status === status);

    const s = q.trim().toLowerCase();
    if (!s) return base;

    return base.filter((b) => {
      return (
        String(b.id || "").includes(s) ||
        String(b.guest?.id || "").includes(s) ||
        String(b.listing?.id || "").includes(s) ||
        (b.guest?.email || "").toLowerCase().includes(s) ||
        (b.listing?.title || "").toLowerCase().includes(s) ||
        (b.status || "").toLowerCase().includes(s)
      );
    });
  }, [items, q, status]);

  async function loadItems() {
    const res = await apiFetch(`/api/v1/admin/bookings?status=${status}`, {
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
  }, [router, status]);

  async function refresh() {
    setLoading(true);
    try {
      await loadItems();
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await apiFetch(`/api/v1/admin/bookings/${id}`, {
        method: "GET",
      });
      setDetail(res.data?.booking || null);
    } catch (e) {
      toast.error(e?.message || "Failed to load booking");
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-72">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search id / user / listing..."
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
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
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t ui-border hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs ui-fg">#{b.id}</div>
                    <div className="mt-0.5 text-xs ui-muted">
                      {fmtDate(b.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium ui-fg">
                      {b.guest?.email || "—"}
                    </div>
                    <div className="mt-0.5 text-xs ui-muted font-mono">
                      UID: {b.guest?.id || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium ui-fg">
                      {b.listing?.title || "—"}
                    </div>
                    <div className="mt-0.5 text-xs ui-muted font-mono">
                      LID: {b.listing?.id || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="ui-fg">
                      {b.check_in || "—"} → {b.check_out || "—"}
                    </div>
                    <div className="mt-0.5 text-xs ui-muted">
                      {b.nights ? `${b.nights} night(s)` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {money(b.total_amount)} ₫
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(b.status)}>{b.status || "—"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge tone={paymentTone(b.last_payment_status)}>
                        {b.last_payment_status || "—"}
                      </Badge>
                      <div className="text-xs ui-muted">
                        {b.last_payment_provider || ""}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDetail(b.id)}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="px-4 py-10 text-center ui-muted" colSpan={8}>
                    Không có booking.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Booking detail"
        description={detail?.id ? `#${detail.id}` : ""}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetailOpen(false)}>
            Close
          </Button>
        }
      >
        {detailLoading ? (
          <div className="py-8 text-sm ui-muted">Loading...</div>
        ) : detail ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-2xl ui-border ui-panel-2">
              <div className="text-sm font-semibold">Info</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">Status:</span>{" "}
                  <Badge tone={statusTone(detail.status)}>
                    {detail.status}
                  </Badge>
                </div>
                <div>
                  <span className="ui-muted">Check-in:</span>{" "}
                  {detail.check_in || "—"}
                </div>
                <div>
                  <span className="ui-muted">Check-out:</span>{" "}
                  {detail.check_out || "—"}
                </div>
                <div>
                  <span className="ui-muted">Total:</span>{" "}
                  <span className="font-semibold">
                    {money(detail.total_amount)} ₫
                  </span>
                </div>
                <div>
                  <span className="ui-muted">Created:</span>{" "}
                  {fmtDate(detail.created_at)}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border ui-panel-2">
              <div className="text-sm font-semibold">User / Listing</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">User:</span>{" "}
                  {detail.guest?.email || "—"}{" "}
                  <span className="font-mono text-xs ui-muted-2">
                    ({detail.guest?.id || "—"})
                  </span>
                </div>
                <div>
                  <span className="ui-muted">Listing:</span>{" "}
                  {detail.listing?.title || "—"}{" "}
                  <span className="font-mono text-xs ui-muted">
                    ({detail.listing?.id || "—"})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border ui-panel-2 md:col-span-2">
              <div className="text-sm font-semibold">Payments</div>
              <div className="mt-3 overflow-hidden border rounded-xl ui-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 ui-muted">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Provider</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.payments || []).map((p) => (
                      <tr key={p.id} className="border-t ui-border">
                        <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                        <td className="px-3 py-2">{p.provider || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge tone={paymentTone(p.status)}>
                            {p.status || "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{money(p.amount)} ₫</td>
                        <td className="px-3 py-2">{fmtDate(p.created_at)}</td>
                      </tr>
                    ))}
                    {!(detail.payments || []).length ? (
                      <tr>
                        <td className="px-3 py-6 ui-muted" colSpan={5}>
                          No payments.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border ui-panel-2 md:col-span-2">
              <div className="text-sm font-semibold">Review</div>
              {detail.review ? (
                <div className="p-4 mt-2 text-sm rounded-xl bg-white/5 ui-fg">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {detail.review.rating}★
                    </span>
                    <span className="ui-muted">•</span>
                    <span className="text-xs ui-muted">
                      {fmtDate(detail.review.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap ui-muted">
                    {detail.review.comment || "—"}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm ui-muted">No review.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-sm ui-muted">No data.</div>
        )}
      </Modal>
    </AdminShell>
  );
}
