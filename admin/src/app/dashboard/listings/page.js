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
import RipleLoading from "@/components/loading/RipleLoading";
import AdminPagination from "@/components/admin/AdminPagination";

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

const PAGE_SIZE = 10;


export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [view, setView] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("Nội dung chưa đạt yêu cầu");

  const [confirm, setConfirm] = useState({
    open: false,
    kind: null,
    item: null,
  });
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

  useEffect(() => {
    setPage(1);
  }, [tab, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

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

  if (loading) return <RipleLoading />;

  return (
    <AdminShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Listings moderation
            </h1>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="w-full md:w-80">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search id/title/city/host..."
              />
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
            {pagedItems.map((x) => (
              <div
                key={x.id}
                className="p-4 border shadow-sm rounded-2xl ui-border ui-panel"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold truncate ui-fg">
                        {x.title || "Untitled"}
                      </div>
                      <StatusBadge status={x.status} />
                      <span className="font-mono text-xs ui-muted">
                        #{x.id}
                      </span>
                    </div>

                    <div className="mt-1 text-sm ui-muted">
                      {x.city ? <span>{x.city}</span> : null}
                      {x.city ? <span> • </span> : null}
                      <span className="ui-muted">
                        Host: {x.host?.full_name || "—"} ({x.host?.email || "—"}
                        )
                      </span>
                    </div>

                    {x.reject_reason ? (
                      <div className="px-3 py-2 mt-2 text-sm rounded-xl bg-rose-50 text-rose-700">
                        <span className="font-semibold">Reject reason:</span>{" "}
                        {x.reject_reason}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setView(x)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>

                    {x.status === "pending" ? (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() =>
                            setConfirm({ open: true, kind: "approve", item: x })
                          }
                          disabled={saving}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openReject(x)}
                          disabled={saving}
                        >
                          <XCircle className="w-4 h-4" />
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
          <div className="p-8 text-center border shadow-sm rounded-2xl ui-border ui-panel ui-muted">
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
            <div className="p-4 border rounded-2xl ui-border">
              <div className="text-sm font-semibold">Summary</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">Status:</span>{" "}
                  <StatusBadge status={view.status} />
                </div>
                <div>
                  <span className="ui-muted">City:</span> {view.city || "—"}
                </div>
                <div>
                  <span className="ui-muted">Host:</span>{" "}
                  {view.host?.full_name || "—"} ({view.host?.email || "—"})
                </div>
                {view.price_per_night != null ? (
                  <div>
                    <span className="ui-muted">Price/night:</span>{" "}
                    {Number(view.price_per_night).toLocaleString()} ₫
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border">
              <div className="text-sm font-semibold">Details</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">Address:</span>{" "}
                  {view.address || "—"}
                </div>
                <div>
                  <span className="ui-muted">Guests:</span>{" "}
                  {view.max_guests || "—"} • Bedrooms: {view.bedrooms || "—"} •
                  Beds: {view.beds || "—"} • Baths: {view.bathrooms || "—"}
                </div>
                <div className="pt-2">
                  <div className="text-xs font-semibold ui-muted">
                    Description
                  </div>
                  <div className="p-3 mt-1 text-sm whitespace-pre-wrap rounded-xl bg-white/5 ui-muted">
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
        description={
          rejectTarget
            ? `#${rejectTarget.id} • ${rejectTarget.title || "Untitled"}`
            : ""
        }
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectOpen(false)}
              disabled={saving}
            >
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
          <div className="text-sm ui-muted">
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
        description={
          confirm.item
            ? `#${confirm.item.id} • ${confirm.item.title || "Untitled"}`
            : ""
        }
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
