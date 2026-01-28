"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

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
  }), [params]);

  const [form, setForm] = useState(initial);

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
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
            <option value="newest">Mới nhất</option>
          </select>

          <button onClick={apply} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600">
            Áp dụng
          </button>
          <button onClick={clear} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Xóa lọc
          </button>
        </div>
      </div>
    </div>
  );
}
