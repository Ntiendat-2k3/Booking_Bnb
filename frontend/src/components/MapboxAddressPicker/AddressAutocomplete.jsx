"use client";

import { useMapboxAutocomplete } from "@/hooks/useMapboxLocation";

export default function AddressAutocomplete({ label = "Địa chỉ", address, onChange, token }) {
  const {
    query,
    setQuery,
    suggestions,
    openSug,
    setOpenSug,
    loadingSug,
    wrapperRef,
    suppressRef,
    selectFeature
  } = useMapboxAutocomplete({
    token,
    initialQuery: address,
    onSelect: onChange
  });

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-sm font-semibold">{label}</label>
      <input
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          suppressRef.current = false;
          setOpenSug(true);
          setQuery(v);
          onChange?.({ address: v });
        }}
        className="mt-2 w-full rounded-xl border px-3 py-2"
        placeholder="Gõ địa chỉ… (Mapbox gợi ý)"
      />

      {token ? (
        <div className="mt-1 text-xs text-slate-500">
          {loadingSug ? "Đang gợi ý..." : "Gõ >= 3 ký tự để hiện gợi ý • Chọn gợi ý để tự điền lat/lng"}
        </div>
      ) : (
        <div className="mt-1 text-xs text-rose-600">
          Thiếu NEXT_PUBLIC_MAPBOX_TOKEN → chưa bật autocomplete/map.
        </div>
      )}

      {openSug && suggestions.length ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border bg-white shadow">
          {suggestions.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFeature(f)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              {f.place_name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
