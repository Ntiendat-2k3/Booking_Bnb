"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ensureCsrf, fetchProfile } from "@/store/authThunks";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useRouter } from "next/navigation";

const STATUS_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "draft", label: "Draft" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "published", label: "Đang hiển thị" },
  { key: "paused", label: "Tạm dừng" },
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

export default function HostListingsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((x) => x.status === tab);
  }, [items, tab]);

  async function load() {
    setLoading(true);
    try {
      await dispatch(ensureCsrf());
      await dispatch(fetchProfile());

      const res = await apiFetch(`/api/v1/host/listings${tab !== "all" ? `?status=${encodeURIComponent(tab)}` : ""}`, { method: "GET" });
      setItems(res.data?.items || []);
    } catch (e) {
      if (e?.status === 403) router.replace("/host");
      else if (e?.status === 401) router.replace("/login");
      else notifyError(e?.message || "Không tải được danh sách phòng");
    } finally {
      setLoading(false);
    }
  }


async function onDelete(id) {
  const ok = window.confirm("Xóa phòng này? (Chỉ nên xóa khi chưa published)");
  if (!ok) return;
  try {
    await dispatch(ensureCsrf());
    await apiFetch(`/api/v1/host/listings/${id}`, { method: "DELETE", body: JSON.stringify({}) });
    notifySuccess("Đã xóa phòng");
    await load();
  } catch (e) {
    notifyError(e?.message || "Xóa thất bại");
  }
}

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-xl font-semibold">Host • Quản lý phòng</h1>
          <p className="mt-2 text-slate-600">Bạn cần đăng nhập.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "host" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-xl font-semibold">Bạn chưa là Host</h1>
          <p className="mt-2 text-slate-600">Hãy xác nhận để trở thành Host trước khi đăng phòng.</p>
          <div className="mt-4">
            <Link href="/host" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Trở thành host
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Host • Quản lý phòng</h1>
          <p className="text-slate-600">
            Tạo phòng (draft) → thêm tiện nghi + ảnh → <b>gửi admin duyệt</b> → admin duyệt thì mới hiển thị lên trang public.
          </p>
        </div>

        <Link href="/host/listings/new" className="inline-flex w-fit rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          + Tạo phòng mới
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${tab === t.key ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-slate-600">Loading...</div>
      ) : filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((x) => (
            <div key={x.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-16 w-24 overflow-hidden rounded-xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={x.cover_url || "https://picsum.photos/seed/cover/400/300"} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{x.title}</div>
                    <Badge status={x.status} />
                  </div>
                  <div className="text-sm text-slate-600">
                    {x.city}, {x.country} • {Number(x.price_per_night || 0).toLocaleString("vi-VN")}₫/đêm • {x.max_guests} khách
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Listing UUID: <span className="font-mono">{x.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/host/listings/${x.id}`} className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                  Quản lý
                </Link>
                {x.status === "published" ? (
                  <Link href={`/rooms/${x.id}`} className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                    Xem public
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-6 text-slate-600">
          Chưa có phòng nào. Hãy tạo phòng mới.
        </div>
      )}
    </div>
  );
}
