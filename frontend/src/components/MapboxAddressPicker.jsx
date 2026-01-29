"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CENTER = { lng: 106.700987, lat: 10.776889 }; // HCMC
const DEFAULT_ZOOM = 12;

function pickFromContext(feature, type) {
  const ctx = feature?.context || [];
  const found = ctx.find((c) => (c.id || "").startsWith(type + "."));
  return found?.text || "";
}

function asNum(v) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

async function geocodeForward(q, token) {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&autocomplete=true&limit=6&language=vi`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Mapbox geocoding failed");
  return res.json();
}

async function geocodeReverse(lng, lat, token) {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1&language=vi`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Mapbox reverse geocoding failed");
  return res.json();
}

export default function MapboxAddressPicker({
  address,
  city,
  country,
  lat,
  lng,
  onChange, // (partial) => void
  label = "Địa chỉ",
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const wrapperRef = useRef(null);
  const suppressRef = useRef(false);

  const [query, setQuery] = useState(address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [openSug, setOpenSug] = useState(false);
  const [loadingSug, setLoadingSug] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const latNum = useMemo(() => asNum(lat), [lat]);
  const lngNum = useMemo(() => asNum(lng), [lng]);

  // keep local input in sync when parent changes (boot/edit)
  useEffect(() => {
    setQuery(address || "");
  }, [address]);

  // close suggestions when clicking outside
  useEffect(() => {
    function onDocMouseDown(e) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        setOpenSug(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // init map
  useEffect(() => {
    if (!token) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = token;

      const center = lngNum !== null && latNum !== null ? { lng: lngNum, lat: latNum } : DEFAULT_CENTER;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center.lng, center.lat],
        zoom: lngNum !== null && latNum !== null ? 14 : DEFAULT_ZOOM,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      const marker = new mapboxgl.Marker({ draggable: true })
        .setLngLat([center.lng, center.lat])
        .addTo(map);

      marker.on("dragend", async () => {
        const ll = marker.getLngLat();
        onChange?.({ lng: String(ll.lng), lat: String(ll.lat) });
        try {
          const rev = await geocodeReverse(ll.lng, ll.lat, token);
          const f = rev?.features?.[0];
          if (f?.place_name) {
            onChange?.({
              address: f.place_name,
              city: pickFromContext(f, "place") || city,
              country: pickFromContext(f, "country") || country,
            });
          }
        } catch {
          // ignore reverse errors
        }
      });

      map.on("click", async (e) => {
        const ll = e.lngLat;
        marker.setLngLat([ll.lng, ll.lat]);
        onChange?.({ lng: String(ll.lng), lat: String(ll.lat) });

        try {
          const rev = await geocodeReverse(ll.lng, ll.lat, token);
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
      });

      if (cancelled) return;

      mapRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Whenever lat/lng change from outside (select suggestion / boot), update map
  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current || !markerRef.current) return;
    if (lngNum === null || latNum === null) return;

    try {
      markerRef.current.setLngLat([lngNum, latNum]);
      mapRef.current.easeTo({ center: [lngNum, latNum], zoom: 14, duration: 300 });
    } catch {}
  }, [lngNum, latNum, mapReady]);

  // autocomplete with debounce
  useEffect(() => {
    if (!token) return;

    // If the last query change came from selecting a suggestion, do not refetch immediately.
    if (suppressRef.current) {
      setSuggestions([]);
      setOpenSug(false);
      return;
    }

    if (!openSug) {
      setSuggestions([]);
      return;
    }

    const q = (query || "").trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoadingSug(true);
    const t = setTimeout(async () => {
      try {
        const data = await geocodeForward(q, token);
        setSuggestions(data?.features || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query, token]);

  function selectFeature(f) {
    const center = f?.center; // [lng, lat]
    const newAddr = f?.place_name || query;

    suppressRef.current = true;
    setOpenSug(false);
    setSuggestions([]);
    setQuery(newAddr);

    const next = { address: newAddr };

    const nextCity = pickFromContext(f, "place");
    const nextCountry = pickFromContext(f, "country");
    if (nextCity) next.city = nextCity;
    if (nextCountry) next.country = nextCountry;

    if (Array.isArray(center) && center.length >= 2) {
      next.lng = String(center[0]);
      next.lat = String(center[1]);
    }

    onChange?.(next);
    // allow autocomplete again after a short delay
    setTimeout(() => {
      suppressRef.current = false;
    }, 600);
  }

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
    <div ref={wrapperRef} className="space-y-3">
      <div className="relative">
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

      <div className="overflow-hidden rounded-2xl border bg-slate-50">
        <div ref={mapContainerRef} className="h-64 w-full" />
      </div>

      <div className="text-xs text-slate-500">
        Tip: Click map để đặt marker, kéo marker để đổi vị trí. Vị trí sẽ tự reverse-geocode về địa chỉ.
      </div>
    </div>
  );
}
