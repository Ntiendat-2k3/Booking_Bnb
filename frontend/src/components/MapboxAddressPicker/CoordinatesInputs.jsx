"use client";

import { asNum, pickFromContext, geocodeReverse } from "@/hooks/useMapboxLocation";

export default function CoordinatesInputs({ city, country, lat, lng, onChange, token }) {
  async function onLatLngBlur() {
    if (!token) return;
    const la = asNum(lat);
    const ln = asNum(lng);
    if (la === null || ln === null) return;

    try {
      const rev = await geocodeReverse(ln, la, token);
      const f = rev?.features?.[0];
      if (f?.place_name) {
        onChange?.({
          address: f.place_name,
          city: pickFromContext(f, "place") || city,
          country: pickFromContext(f, "country") || country,
        });
      }
    } catch {
      // ignore
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Thành phố</label>
          <input
            value={city || ""}
            onChange={(e) => onChange?.({ city: e.target.value })}
            className="mt-2 w-full rounded-xl border px-3 py-2"
            placeholder="Ví dụ: Hồ Chí Minh"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Quốc gia</label>
          <input
            value={country || ""}
            onChange={(e) => onChange?.({ country: e.target.value })}
            className="mt-2 w-full rounded-xl border px-3 py-2"
            placeholder="Ví dụ: Vietnam"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Latitude</label>
          <input
            value={lat || ""}
            onChange={(e) => onChange?.({ lat: e.target.value })}
            onBlur={onLatLngBlur}
            className="mt-2 w-full rounded-xl border px-3 py-2"
            placeholder="10.776889"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Longitude</label>
          <input
            value={lng || ""}
            onChange={(e) => onChange?.({ lng: e.target.value })}
            onBlur={onLatLngBlur}
            className="mt-2 w-full rounded-xl border px-3 py-2"
            placeholder="106.700987"
          />
        </div>
      </div>
    </>
  );
}
