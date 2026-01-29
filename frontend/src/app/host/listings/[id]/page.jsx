"use client";

function numOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v) {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { ensureCsrf, fetchProfile } from "@/store/authThunks";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import ListingImageUploader from "@/components/ListingImageUploader";

function groupAmenities(items = []) {
  const map = new Map();
  for (const a of items) {
    const g = a.group || "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(a);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

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

export default function HostListingManagePage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [listing, setListing] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [picked, setPicked] = useState(new Set());

  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    country: "Vietnam",
    property_type: "",
    room_type: "",
    price_per_night: 500000,
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    lat: "",
    lng: "",
  });

  const groups = useMemo(() => groupAmenities(amenities), [amenities]);

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function toggleAmenity(aid) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(aid)) next.delete(aid);
      else next.add(aid);
      return next;
    });
  }

  async function boot() {
    setLoading(true);
    try {
      await dispatch(ensureCsrf());
      await dispatch(fetchProfile());

      const [a, r] = await Promise.all([
        apiFetch("/api/v1/amenities", { method: "GET" }),
        apiFetch(`/api/v1/host/listings/${id}`, { method: "GET" }),
      ]);

      const items = a.data?.items || a.data || [];
      setAmenities(items);

      const l = r.data?.listing;
      setListing(l);

      // fill form
      setForm({
        title: l?.title || "",
        description: l?.description || "",
        address: l?.address || "",
        city: l?.city || "",
        country: l?.country || "Vietnam",
        property_type: l?.property_type || "",
        room_type: l?.room_type || "",
        price_per_night: l?.price_per_night || 500000,
        max_guests: l?.max_guests || 2,
        bedrooms: l?.bedrooms || 1,
        beds: l?.beds || 1,
        bathrooms: l?.bathrooms || 1,
        lat: l?.lat || "",
        lng: l?.lng || "",
      });

      setPicked(new Set((l?.amenities || []).map((x) => x.id)));
    } catch (e) {
      if (e?.status === 401) router.replace("/login");
      else if (e?.status === 403) router.replace("/host");
      else notifyError(e?.message || "Không tải được dữ liệu listing");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/host/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          price_per_night: intOrNull(form.price_per_night),
          max_guests: intOrNull(form.max_guests),
          bedrooms: intOrNull(form.bedrooms) ?? 0,
          beds: intOrNull(form.beds) ?? 0,
          bathrooms: numOrNull(form.bathrooms) ?? 0,
          lat: numOrNull(form.lat),
          lng: numOrNull(form.lng),
        }),
      });

      await apiFetch(`/api/v1/host/listings/${id}/amenities`, {
        method: "PUT",
        body: JSON.stringify({ amenity_ids: Array.from(picked) }),
      });

      notifySuccess("Đã lưu thay đổi");
      await boot();
    } catch (e) {
      notifyError(e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    try {
      await apiFetch(`/api/v1/host/listings/${id}/submit`, { method: "POST", body: JSON.stringify({}) });
      notifySuccess("Đã gửi admin duyệt ✅");
      await boot();
    } catch (e) {
      notifyError(e?.message || "Gửi duyệt thất bại");
    }
  }

  async function onPause() {
    try {
      await apiFetch(`/api/v1/host/listings/${id}/pause`, { method: "POST", body: JSON.stringify({}) });
      notifySuccess("Đã tạm dừng hiển thị");
      await boot();
    } catch (e) {
      notifyError(e?.message || "Pause thất bại");
    }
  }

  async function onResume() {
    try {
      await apiFetch(`/api/v1/host/listings/${id}/resume`, { method: "POST", body: JSON.stringify({}) });
      notifySuccess("Đã bật hiển thị lại");
      await boot();
    } catch (e) {
      notifyError(e?.message || "Resume thất bại");
    }
  }

  if (loading) {
    return <div className="rounded-2xl border bg-white p-6 text-slate-600">Loading...</div>;
  }

  if (!listing) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-600">
        Không tìm thấy listing.
      </div>
    );
  }

  const status = listing.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quản lý phòng</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge status={status} />
            <span>
              Listing UUID: <span className="font-mono">{listing.id}</span>
            </span>
            {status === "rejected" && listing.reject_reason ? (
              <span className="text-rose-700">• Lý do: {listing.reject_reason}</span>
            ) : null}
          </div>
          <p className="mt-2 text-slate-600">
            Flow: Draft → upload ảnh + chọn tiện nghi → <b>Gửi duyệt</b> → Admin duyệt thì mới lên public.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/host/listings" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            ← Danh sách phòng
          </Link>

          {status === "published" ? (
            <>
              <Link href={`/rooms/${listing.id}`} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                Xem public
              </Link>
              <button onClick={onPause} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                Tạm dừng
              </button>
            </>
          ) : null}

          {status === "paused" ? (
            <button onClick={onResume} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Bật hiển thị
            </button>
          ) : null}

          {(status === "draft" || status === "rejected" || status === "paused") ? (
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          ) : null}

          {(status === "draft" || status === "rejected") ? (
            <button onClick={onSubmit} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
              Gửi duyệt
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2 rounded-2xl border bg-white p-6">
          <div>
            <label className="text-sm font-semibold">Tiêu đề</label>
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
          </div>

          <div>
            <label className="text-sm font-semibold">Mô tả</label>
            <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" rows={5} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Địa chỉ</label>
              <input value={form.address} onChange={(e) => setField("address", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Thành phố</label>
              <input value={form.city} onChange={(e) => setField("city", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Quốc gia</label>
              <input value={form.country} onChange={(e) => setField("country", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Giá / đêm (VND)</label>
              <input type="number" value={form.price_per_night} onChange={(e) => setField("price_per_night", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>

            <div>
              <label className="text-sm font-semibold">Max guests</label>
              <input type="number" value={form.max_guests} onChange={(e) => setField("max_guests", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Bedrooms</label>
              <input type="number" value={form.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Beds</label>
              <input type="number" value={form.beds} onChange={(e) => setField("beds", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Bathrooms</label>
              <input type="number" step="0.5" value={form.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Property type</label>
              <input value={form.property_type} onChange={(e) => setField("property_type", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Room type</label>
              <input value={form.room_type} onChange={(e) => setField("room_type", e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm font-semibold">Tiện nghi (Amenities)</div>
            <p className="mt-1 text-sm text-slate-600">Tick những tiện nghi có trong phòng.</p>

            <div className="mt-4 space-y-4">
              {groups.map(([g, items]) => (
                <div key={g}>
                  <div className="text-sm font-semibold">{g}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {items.map((a) => {
                      const on = picked.has(a.id);
                      return (
                        <button
                          type="button"
                          key={a.id}
                          onClick={() => toggleAmenity(a.id)}
                          className={`rounded-full border px-3 py-1.5 text-sm ${on ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"}`}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ListingImageUploader listingId={listing.id} />

          <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Checklist trước khi gửi duyệt</div>
            <ul className="mt-2 list-disc pl-5">
              <li>Title/City/Country/Price/Guests đầy đủ</li>
              <li>Có ít nhất 1 ảnh (cover)</li>
              <li>Chọn tiện nghi phù hợp</li>
              <li>Nội dung khớp trang Room Detail</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
