"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import MapboxAddressPicker from "@/components/MapboxAddressPicker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { ensureCsrf, fetchProfile } from "@/store/authThunks";

function groupAmenities(items = []) {
  const map = new Map();
  for (const a of items) {
    const g = a.group || "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(a);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

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

export default function NewListingPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
    async function boot() {
      try {
        await dispatch(ensureCsrf());
        await dispatch(fetchProfile());
        const a = await apiFetch("/api/v1/amenities", { method: "GET" });
        setAmenities(a.data?.items || a.data || []);
      } catch (e) {
        notifyError(e?.message || "Không tải được amenities");
      }
    }
    boot();
  }, [dispatch]);

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function toggleAmenity(id) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch("/api/v1/host/listings", {
        method: "POST",
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
      const listing = res.data?.listing;
      if (!listing?.id) throw new Error("Create failed");

      if (picked.size) {
        await apiFetch(`/api/v1/host/listings/${listing.id}/amenities`, {
          method: "PUT",
          body: JSON.stringify({ amenity_ids: Array.from(picked) }),
        });
      }

      notifySuccess("Đã tạo phòng (draft). Hãy thêm ảnh rồi gửi duyệt.");
      router.replace(`/host/listings/${listing.id}`);
    } catch (e2) {
      notifyError(e2?.message || "Tạo phòng thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tạo phòng mới (Draft)</h1>
        </div>
        <Link
          href="/host/listings"
          className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-slate-50"
        >
          ← Quay lại
        </Link>
      </div>

      <form onSubmit={onCreate} className="grid gap-6 lg:grid-cols-3">
        {/* CỘT TRÁI: CHIẾM 2 PHẦN */}
        <div className="space-y-4 lg:col-span-2">
          <div className="p-6 space-y-4 bg-white border rounded-2xl">
            <div>
              <label className="text-sm font-semibold">Tiêu đề</label>
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className="w-full px-3 py-2 mt-2 border rounded-xl"
                placeholder="Ví dụ: Căn hộ studio trung tâm Q1"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Mô tả</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="w-full px-3 py-2 mt-2 border rounded-xl"
                rows={5}
                placeholder="Mô tả ngắn gọn..."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MapboxAddressPicker
                  address={form.address}
                  city={form.city}
                  country={form.country}
                  lat={form.lat}
                  lng={form.lng}
                  onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Giá / đêm (VND)</label>
                <input
                  type="number"
                  value={form.price_per_night}
                  onChange={(e) => setField("price_per_night", e.target.value)}
                  className="w-full px-3 py-2 mt-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Số khách tối đa</label>
                <input
                  type="number"
                  value={form.max_guests}
                  onChange={(e) => setField("max_guests", e.target.value)}
                  className="w-full px-3 py-2 mt-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Phòng ngủ</label>
                <input
                  type="number"
                  value={form.bedrooms}
                  onChange={(e) => setField("bedrooms", e.target.value)}
                  className="w-full px-3 py-2 mt-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Giường</label>
                <input
                  type="number"
                  value={form.beds}
                  onChange={(e) => setField("beds", e.target.value)}
                  className="w-full px-3 py-2 mt-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Phòng tắm</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.bathrooms}
                  onChange={(e) => setField("bathrooms", e.target.value)}
                  className="w-full px-3 py-2 mt-2 border rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">Loại nhà</label>
                <input
                  value={form.property_type}
                  onChange={(e) => setField("property_type", e.target.value)}
                  className="w-full px-3 py-2 mt-2 border rounded-xl"
                  placeholder="Apartment/House/..."
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Loại phòng</label>
                <input
                  value={form.room_type}
                  onChange={(e) => setField("room_type", e.target.value)}
                  className="w-full px-3 py-2 mt-2 border rounded-xl"
                  placeholder="Entire place/Private room/..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: CHIẾM 1 PHẦN (TIỆN NGHI & SUBMIT) */}
        <div className="space-y-4">
          <div className="p-6 bg-white border rounded-2xl">
            <div className="text-sm font-semibold">Tiện nghi</div>
            <p className="mt-1 text-sm text-slate-600">
              Chọn các tiện ích có sẵn.
            </p>

            <div className="mt-3 space-y-4 max-h-[520px] overflow-auto pr-1">
              {groups.map(([g, arr]) => (
                <div key={g}>
                  <div className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                    {g}
                  </div>
                  <div className="mt-2 space-y-2">
                    {arr.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 p-1 text-sm rounded cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={picked.has(a.id)}
                          onChange={() => toggleAmenity(a.id)}
                        />
                        {a.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-3 text-base font-bold text-white transition-all rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "Đang xử lý..." : "Tạo phòng (Draft)"}
          </button>
        </div>
      </form>
    </div>
  );
}
