"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { notifyError, notifyInfo } from "@/lib/notify";

export default function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const initial = useMemo(() => ({
    city: params.get("city") || "",
    min_price: params.get("min_price") || "",
    max_price: params.get("max_price") || "",
    guests: params.get("guests") || "",
    bedrooms: params.get("bedrooms") || "",
    sort: params.get("sort") || "rating_desc",
    // Nearby search
    lat: params.get("lat") || "",
    lng: params.get("lng") || "",
    radius_km: params.get("radius_km") || "",
  }), [params]);

  const [form, setForm] = useState(initial);

  // Keep local form in sync with the URL (so back/forward + chip navigation works)
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  function setField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function apply() {
    const q = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== "" && v != null) q.set(k, v);
    });
    router.push("/search?" + q.toString());
  }

  function clear() {
    router.push("/search");
  }

  async function useMyLocation() {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      notifyError("Trình duyệt không hỗ trợ định vị (geolocation).");
      return;
    }

    notifyInfo("Đang lấy vị trí hiện tại...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (latitude == null || longitude == null) {
          notifyError("Không lấy được tọa độ.");
          return;
        }
        // Build next form (avoid stale-closure issues)
        const next = {
          ...form,
          lat: String(latitude),
          lng: String(longitude),
          radius_km: form.radius_km || "20",
          sort: "distance_asc",
        };
        setForm(next);

        // Auto apply like Airbnb
        const q = new URLSearchParams();
        Object.entries(next).forEach(([k, v]) => {
          if (v !== "" && v != null) q.set(k, v);
        });
        router.push("/search?" + q.toString());
      },
      (err) => {
        // Common error codes: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT
        if (err?.code === 1) notifyError("Bạn đã từ chối quyền truy cập vị trí. Hãy bật lại trong cài đặt trình duyệt.");
        else if (err?.code === 2) notifyError("Không thể xác định vị trí hiện tại.");
        else if (err?.code === 3) notifyError("Lấy vị trí bị timeout. Thử lại nhé.");
        else notifyError(err?.message || "Lỗi lấy vị trí.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="text-xs text-slate-600">Thành phố</label>
          <input value={form.city} onChange={(e) => setField("city", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="Hồ Chí Minh / Seoul..." />
        </div>
        <div>
          <label className="text-xs text-slate-600">Giá từ</label>
          <input value={form.min_price} onChange={(e) => setField("min_price", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="500000" />
        </div>
        <div>
          <label className="text-xs text-slate-600">Giá đến</label>
          <input value={form.max_price} onChange={(e) => setField("max_price", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="2000000" />
        </div>
        <div>
          <label className="text-xs text-slate-600">Khách</label>
          <input value={form.guests} onChange={(e) => setField("guests", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="2" />
        </div>
        <div>
          <label className="text-xs text-slate-600">Phòng ngủ</label>
          <input value={form.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="1" />
        </div>

        <div className="md:col-span-6 flex flex-wrap items-center gap-2 pt-1">
          <select value={form.sort} onChange={(e) => setField("sort", e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
            <option value="rating_desc">Đánh giá cao</option>
            {form.lat && form.lng ? <option value="distance_asc">Gần nhất</option> : null}
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="newest">Mới nhất</option>
          </select>

          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            title="Tìm chỗ ở gần vị trí hiện tại"
          >
            📍 Gần tôi
          </button>

          <button onClick={apply} className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Áp dụng
          </button>
          <button onClick={clear} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Xóa lọc
          </button>

          {/* Hidden fields so we can keep location params while applying other filters */}
          <input type="hidden" value={form.lat} readOnly />
          <input type="hidden" value={form.lng} readOnly />
        </div>
      </div>

      {form.lat && form.lng ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <div className="rounded-full bg-slate-100 px-3 py-1">
            Đang lọc theo vị trí của bạn
          </div>
          <div className="flex items-center gap-2">
            <span>Bán kính (km):</span>
            <input
              value={form.radius_km}
              onChange={(e) => setField("radius_km", e.target.value)}
              className="w-24 rounded-xl border px-3 py-1"
              placeholder="20"
            />
          </div>
          <button
            type="button"
            onClick={() => setForm((s) => ({ ...s, lat: "", lng: "", radius_km: "", sort: "rating_desc" }))}
            className="rounded-xl border px-3 py-1 hover:bg-slate-50"
          >
            Tắt “gần tôi"
          </button>
        </div>
      ) : null}
    </div>
  );
}
