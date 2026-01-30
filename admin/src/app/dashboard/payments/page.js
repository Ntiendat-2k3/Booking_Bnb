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
  "pending",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
];
const PROVIDERS = ["all", "vnpay", "stripe"];

function tone(v) {
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
  const [provider, setProvider] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => {
      return (
        String(p.id || "").includes(s) ||
        String(p.booking_id || "").includes(s) ||
        (p.provider || "").toLowerCase().includes(s) ||
        (p.status || "").toLowerCase().includes(s) ||
        (p.provider_txn_ref || p.txn_ref || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  async function loadItems() {
    const res = await apiFetch(
      `/api/v1/admin/payments?status=${status}&provider=${provider}`,
      { method: "GET" },
    );
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
  }, [router, status, provider]);

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
      const res = await apiFetch(`/api/v1/admin/payments/${id}`, {
        method: "GET",
      });
      setDetail(res.data?.payment || null);
    } catch (e) {
      toast.error(e?.message || "Failed to load payment");
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
            <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-72">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search id / booking / txn_ref..."
              />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
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
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t ui-border hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs ui-muted">#{p.id}</div>
                    <div className="mt-0.5 text-xs ui-muted">
                      {p.provider_txn_ref || p.txn_ref
                        ? `ref: ${p.provider_txn_ref || p.txn_ref}`
                        : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs ui-muted">
                      {p.booking_id ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.provider || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tone(p.status)}>{p.status || "—"}</Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {money(p.amount)} ₫
                  </td>
                  <td className="px-4 py-3">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDetail(p.id)}
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
                  <td className="px-4 py-10 text-center ui-muted" colSpan={7}>
                    Không có payment.
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
        title="Payment detail"
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
                  <span className="ui-muted">Provider:</span>{" "}
                  {detail.provider || "—"}
                </div>
                <div>
                  <span className="ui-muted">Status:</span>{" "}
                  <Badge tone={tone(detail.status)}>
                    {detail.status || "—"}
                  </Badge>
                </div>
                <div>
                  <span className="ui-muted">Amount:</span>{" "}
                  <span className="font-semibold">
                    {money(detail.amount)} ₫
                  </span>
                </div>
                <div>
                  <span className="ui-muted">Booking:</span>{" "}
                  <span className="font-mono text-xs">
                    {detail.booking_id ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="ui-muted">Txn ref:</span>{" "}
                  {detail.provider_txn_ref || detail.txn_ref || "—"}
                </div>
                <div>
                  <span className="ui-muted">Txn no:</span>{" "}
                  {detail.provider_transaction_no || "—"}
                </div>
                <div>
                  <span className="ui-muted">Created:</span>{" "}
                  {fmtDate(detail.created_at)}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border ui-panel-2">
              <div className="text-sm font-semibold">Booking snapshot</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">User:</span>{" "}
                  {detail.booking?.guest?.email || "—"}
                </div>
                <div>
                  <span className="ui-muted">Listing:</span>{" "}
                  {detail.booking?.listing?.title || "—"}
                </div>
                <div>
                  <span className="ui-muted">Dates:</span>{" "}
                  {detail.booking?.check_in || "—"} →{" "}
                  {detail.booking?.check_out || "—"}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border ui-panel-2 md:col-span-2">
              <div className="text-sm font-semibold">Raw payload</div>
              <pre className="mt-3 max-h-[360px] overflow-auto rounded-xl bg-white/5 p-4 text-xs ui-fg">
                {JSON.stringify(detail.payload || {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="py-8 text-sm ui-muted">No data.</div>
        )}
      </Modal>
    </AdminShell>
  );
}
