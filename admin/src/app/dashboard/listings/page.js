"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Eye, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "published", label: "Đang hiển thị" },
  { key: "paused", label: "Tạm dừng" },
  { key: "draft", label: "Draft" },
  { key: "rejected", label: "Bị từ chối" },
];

function StatusBadge({ status }) {
  const tone =
    status === "published"
      ? "emerald"
      : status === "pending"
      ? "amber"
      : status === "rejected"
      ? "rose"
      : status === "paused"
      ? "slate"
      : status === "draft"
      ? "zinc"
      : "zinc";
  return <Badge tone={tone}>{status}</Badge>;
}

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const [view, setView] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("Nội dung chưa đạt yêu cầu");

  const [confirm, setConfirm] = useState({ open: false, kind: null, item: null });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    let base = items;
    if (tab !== "all") base = base.filter((x) => x.status === tab);
    const s = q.trim().toLowerCase();
    if (!s) return base;
    return base.filter((x) => {
      return (
        (x.title || "").toLowerCase().includes(s) ||
        (x.city || "").toLowerCase().includes(s) ||
        (x.host?.email || "").toLowerCase().includes(s) ||
        (x.host?.full_name || "").toLowerCase().includes(s) ||
        String(x.id || "").includes(s)
      );
    });
  }, [items, tab, q]);

  async function loadItems() {
    const res = await apiFetch(`/api/v1/admin/listings`, { method: "GET" });
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

  async function approve(id) {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/admin/listings/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success("Listing approved");
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Approve failed");
    } finally {
      setSaving(false);
    }
  }

  async function reject(id, reason) {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/admin/listings/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast.success("Listing rejected");
      await refresh();
    } catch (e) {
      toast.error(e?.message || "Reject failed");
    } finally {
      setSaving(false);
    }
  }

  function openReject(item) {
    setRejectTarget(item);
    setRejectReason(item?.reject_reason || "Nội dung chưa đạt yêu cầu");
    setRejectOpen(true);
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Listings moderation</h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-80">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id/title/city/host..." />
            </div>
            <Button onClick={refresh} variant="secondary">
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={tab === t.key ? "primary" : "secondary"}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {filtered.length ? (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((x) => (
              <div key={x.id} className="rounded-2xl border border-(--ui-border) bg-(--ui-panel) p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-base font-semibold text-(--foreground)">
                        {x.title || "Untitled"}
                      </div>
                      <StatusBadge status={x.status} />
                      <span className="text-xs font-mono text-(--ui-muted)">#{x.id}</span>
                    </div>

                    <div className="mt-1 text-sm text-(--ui-muted)">
                      {x.city ? <span>{x.city}</span> : null}
                      {x.city ? <span> • </span> : null}
                      <span className="text-(--ui-muted)">
                        Host: {x.host?.full_name || "—"} ({x.host?.email || "—"})
                      </span>
                    </div>

                    {x.reject_reason ? (
                      <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        <span className="font-semibold">Reject reason:</span> {x.reject_reason}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button variant="secondary" size="sm" onClick={() => setView(x)}>
                      <Eye className="h-4 w-4" />
                      View
                    </Button>

                    {x.status === "pending" ? (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => setConfirm({ open: true, kind: "approve", item: x })}
                          disabled={saving}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openReject(x)}
                          disabled={saving}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-(--ui-border) bg-(--ui-panel) p-8 text-center text-(--ui-muted) shadow-sm">
            Không có items.
          </div>
        )}
      </div>

      <Modal
        open={!!view}
        onClose={() => setView(null)}
        title="Listing information"
        description={view ? `#${view.id} • ${view.title || "Untitled"}` : ""}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setView(null)}>
            Close
          </Button>
        }
      >
        {view ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-(--ui-border) p-4">
              <div className="text-sm font-semibold">Summary</div>
              <div className="mt-2 space-y-1 text-sm text-(--foreground)">
                <div>
                  <span className="text-(--ui-muted)">Status:</span> <StatusBadge status={view.status} />
                </div>
                <div>
                  <span className="text-(--ui-muted)">City:</span> {view.city || "—"}
                </div>
                <div>
                  <span className="text-(--ui-muted)">Host:</span> {view.host?.full_name || "—"} ({view.host?.email || "—"})
                </div>
                {view.price_per_night != null ? (
                  <div>
                    <span className="text-(--ui-muted)">Price/night:</span> {Number(view.price_per_night).toLocaleString()} ₫
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-(--ui-border) p-4">
              <div className="text-sm font-semibold">Details</div>
              <div className="mt-2 space-y-1 text-sm text-(--foreground)">
                <div>
                  <span className="text-(--ui-muted)">Address:</span> {view.address || "—"}
                </div>
                <div>
                  <span className="text-(--ui-muted)">Guests:</span> {view.max_guests || "—"} • Bedrooms:{" "}
                  {view.bedrooms || "—"} • Beds: {view.beds || "—"} • Baths: {view.bathrooms || "—"}
                </div>
                <div className="pt-2">
                  <div className="text-xs font-semibold text-(--ui-muted)">Description</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-xl bg-white/5 p-3 text-sm text-(--ui-muted)">
                    {view.description || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => {
          if (!saving) setRejectOpen(false);
        }}
        title="Reject listing"
        description={rejectTarget ? `#${rejectTarget.id} • ${rejectTarget.title || "Untitled"}` : ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!rejectTarget) return;
                setRejectOpen(false);
                await reject(rejectTarget.id, rejectReason);
              }}
              disabled={saving}
            >
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-(--ui-muted)">
            Nhập lý do để host sửa lại. (Có thể để trống nếu bạn muốn.)
          </div>
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Lý do từ chối..."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, kind: null, item: null })}
        title="Approve listing?"
        description={confirm.item ? `#${confirm.item.id} • ${confirm.item.title || "Untitled"}` : ""}
        confirmText="Approve"
        cancelText="Cancel"
        loading={saving}
        onConfirm={async () => {
          const it = confirm.item;
          setConfirm({ open: false, kind: null, item: null });
          if (it) await approve(it.id);
        }}
      />
    </AdminShell>
  );
}
