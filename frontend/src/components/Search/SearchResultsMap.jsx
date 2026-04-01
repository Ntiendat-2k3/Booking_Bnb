"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapPopupCard from "./MapPopupCard";

const DEFAULT_CENTER = { lng: 106.700987, lat: 10.776889 }; // HCMC

function toNum(v) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function formatVndPill(v) {
  try {
    const n = Number(v || 0);
    const s = new Intl.NumberFormat("vi-VN").format(n);
    return `đ${s}`;
  } catch {
    return `đ${v}`;
  }
}

export default function SearchResultsMap({ items = [], userLat, userLng }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markerElsRef = useRef(new Map());
  const userMarkerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);

  const user = useMemo(
    () => ({ lat: toNum(userLat), lng: toNum(userLng) }),
    [userLat, userLng],
  );

  const points = useMemo(() => {
    return (items || [])
      .map((it) => {
        const lat = toNum(it?.lat);
        const lng = toNum(it?.lng);
        if (lat == null || lng == null) return null;
        return { ...it, lat, lng };
      })
      .filter(Boolean);
  }, [items]);

  const initialCenter = useMemo(() => {
    if (user.lat != null && user.lng != null)
      return { lat: user.lat, lng: user.lng };
    if (points.length) return { lat: points[0].lat, lng: points[0].lng };
    return DEFAULT_CENTER;
  }, [user.lat, user.lng, points]);

  // init map
  useEffect(() => {
    if (!token) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [initialCenter.lng, initialCenter.lat],
        zoom: user.lat != null && user.lng != null ? 12 : 11,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.on("click", () => setSelected(null));

      if (cancelled) return;
      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // keep selected marker styling in sync
  useEffect(() => {
    const selectedId = selected?.id || selected?.listing_id || selected?.uuid;
    markerElsRef.current.forEach((el, id) => {
      if (!el) return;
      const isActive = selectedId != null && String(id) === String(selectedId);
      el.classList.toggle("bg-black", isActive);
      el.classList.toggle("text-white", isActive);
      el.classList.toggle("bg-white", !isActive);
      el.classList.toggle("text-slate-900", !isActive);
    });
  }, [selected]);

  // add / update user marker
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (user.lat == null || user.lng == null) {
      try {
        userMarkerRef.current?.remove();
      } catch {}
      userMarkerRef.current = null;
      return;
    }

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      const el = document.createElement("div");
      el.className =
        "w-3 h-3 bg-blue-600 rounded-full shadow ring-4 ring-blue-200";
      try {
        userMarkerRef.current?.remove();
      } catch {}
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([user.lng, user.lat])
        .addTo(map);
    })();
  }, [ready, user.lat, user.lng]);

  // add markers for listings
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    // cleanup old markers
    try {
      markersRef.current.forEach((m) => m.remove());
    } catch {}
    markersRef.current = [];
    markerElsRef.current = new Map();

    if (!points.length) return;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;

      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((it) => bounds.extend([it.lng, it.lat]));

      points.forEach((it) => {
        const id = it?.id || it?.listing_id || it?.uuid;
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className =
          "px-3 py-1 text-sm font-semibold bg-white border rounded-full shadow-sm text-slate-900 hover:shadow";
        pill.textContent = formatVndPill(it?.price_per_night);

        pill.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelected(it);
          try {
            map.easeTo({ center: [it.lng, it.lat], duration: 250 });
          } catch {}
        });

        markerElsRef.current.set(String(id ?? `${it.lng},${it.lat}`), pill);
        const m = new mapboxgl.Marker({ element: pill, anchor: "bottom" })
          .setLngLat([it.lng, it.lat])
          .addTo(map);
        markersRef.current.push(m);
      });

      // Fit bounds for a nice initial view (but keep it gentle)
      try {
        map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 13 });
      } catch {}
    })();
  }, [ready, points]);

  if (!token) {
    return (
      <div className="flex h-[520px] items-center justify-center p-6 text-center text-sm text-slate-600">
        Thiếu <span className="font-semibold">NEXT_PUBLIC_MAPBOX_TOKEN</span>.
        Thêm token vào biến môi trường để bật bản đồ.
      </div>
    );
  }

  return (
    <div className="relative h-[520px] w-full">
      <div ref={containerRef} className="w-full h-full" />
      <MapPopupCard listing={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
