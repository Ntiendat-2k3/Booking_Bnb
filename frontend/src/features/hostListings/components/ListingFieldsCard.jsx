"use client";

import MapboxAddressPicker from "@/components/MapboxAddressPicker";

export default function ListingFieldsCard({ form, setField, setForm }) {
  const applyPatch = (patch) => {
    if (typeof setForm === "function") {
      setForm((p) => ({ ...p, ...patch }));
      return;
    }
    // fallback: best-effort apply through setField
    Object.entries(patch || {}).forEach(([k, v]) => setField(k, v));
  };

  return (
    <div className="p-6 space-y-4 bg-white border rounded-2xl">
      <div>
        <label className="text-sm font-semibold">Tiêu đề</label>
        <input
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          className="w-full px-3 py-2 mt-2 border rounded-xl"
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Mô tả</label>
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          className="w-full px-3 py-2 mt-2 border rounded-xl min-h-[120px]"
          rows={5}
        />
      </div>

      <div className="sm:col-span-2">
        <MapboxAddressPicker
          address={form.address}
          city={form.city}
          country={form.country}
          lat={form.lat}
          lng={form.lng}
          onChange={applyPatch}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
          <label className="text-sm font-semibold">Max guests</label>
          <input
            type="number"
            value={form.max_guests}
            onChange={(e) => setField("max_guests", e.target.value)}
            className="w-full px-3 py-2 mt-2 border rounded-xl"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-semibold">Bedrooms</label>
          <input
            type="number"
            value={form.bedrooms}
            onChange={(e) => setField("bedrooms", e.target.value)}
            className="w-full px-3 py-2 mt-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Beds</label>
          <input
            type="number"
            value={form.beds}
            onChange={(e) => setField("beds", e.target.value)}
            className="w-full px-3 py-2 mt-2 border rounded-xl"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Bathrooms</label>
          <input
            type="number"
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
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Loại phòng</label>
          <input
            value={form.room_type}
            onChange={(e) => setField("room_type", e.target.value)}
            className="w-full px-3 py-2 mt-2 border rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
