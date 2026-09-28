"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import MapPopupCard from "./MapPopupCard";

const DEFAULT_CENTER = { lng: 106.700987, lat: 10.776889 };

function toNum(v) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function formatVndPill(v, locale) {
  try {
    const n = Number(v || 0);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "VND",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return `${v} ₫`;
  }
}

export default function SearchResultsMap({ items = [], userLat, userLng }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { locale, t } = useLocale();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markerElsRef = useRef(new Map());
  const userMarkerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [failed, setFailed] = useState(false);

  const user = useMemo(
    () => ({ lat: toNum(userLat), lng: toNum(userLng) }),
    [userLat, userLng],
  );

  const points = useMemo(() => {
    return (items || [])
      .map((it) => {
        const lat = toNum(it?.lat);
        const lng = toNum(it?.lng);
        if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
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

  // Khởi tạo bản đồ đúng một lần cho mỗi token.
  useEffect(() => {
    if (!token) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [initialCenter.lng, initialCenter.lat],
        zoom: user.lat != null && user.lng != null ? 12 : 11,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.on("error", () => { if (!cancelled) setFailed(true); });
      map.on("click", () => setSelected(null));

      if (cancelled) return;
      mapRef.current = map;
      setReady(true);
    })().catch(() => { if (!cancelled) setFailed(true); });

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

  // Đồng bộ trạng thái trực quan của ghim đang được chọn.
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

  // Thêm hoặc cập nhật vị trí hiện tại của người dùng.
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
      if (mapRef.current !== map) return;
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

  // Tạo lại các ghim khi danh sách kết quả thay đổi.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    try {
      markersRef.current.forEach((m) => m.remove());
    } catch {}
    markersRef.current = [];
    markerElsRef.current = new Map();

    if (!points.length) return;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (mapRef.current !== map) return;

      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((it) => bounds.extend([it.lng, it.lat]));

      points.forEach((it) => {
        const id = it?.id || it?.listing_id || it?.uuid;
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className =
          "min-h-11 px-3 py-1 text-sm font-semibold bg-white border rounded-full shadow-sm text-slate-900 hover:shadow";
        pill.setAttribute("aria-label", `${it.title}: ${formatVndPill(it.price_per_night, locale === "en" ? "en-US" : "vi-VN")}`);
        pill.textContent = formatVndPill(
          it?.price_per_night,
          locale === "en" ? "en-US" : "vi-VN",
        );

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

      try {
        map.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 13 });
      } catch {}
    })();
  }, [locale, points, ready]);

  if (!token) {
    return (
      <div className="flex h-[520px] items-center justify-center p-6 text-center text-sm leading-6 text-muted-ink">
        {t("search.mapMissingToken")}
      </div>
    );
  }

  return (
    <div className="relative h-[520px] w-full">
      <div ref={containerRef} className="w-full h-full" />
      {failed ? <p role="alert" className="absolute inset-x-3 top-3 rounded-xl bg-surface p-3 text-sm">{t("address.mapError")}</p> : null}
      <MapPopupCard listing={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
