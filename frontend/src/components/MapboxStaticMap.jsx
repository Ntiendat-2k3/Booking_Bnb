"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useInViewport } from "@/hooks/useInViewport";
import "mapbox-gl/dist/mapbox-gl.css";

function asNum(v) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export default function MapboxStaticMap({ lat, lng, heightClass = "h-64" }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const t = useTranslations();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const { viewportRef, visible } = useInViewport(containerRef);

  const latNum = useMemo(() => asNum(lat), [lat]);
  const lngNum = useMemo(() => asNum(lng), [lng]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token || !visible) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;

      const center =
        lngNum !== null && latNum !== null
          ? { lng: lngNum, lat: latNum }
          : { lng: 106.700987, lat: 10.776889 };

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center.lng, center.lat],
        zoom: lngNum !== null && latNum !== null ? 14 : 10,
        interactive: false,
      });

      const marker = new mapboxgl.Marker()
        .setLngLat([center.lng, center.lat])
        .addTo(map);

      if (cancelled) return;

      mapRef.current = map;
      markerRef.current = marker;
      setReady(true);
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
  }, [token, visible]);

  useEffect(() => {
    if (!ready) return;
    if (!mapRef.current || !markerRef.current) return;
    if (lngNum === null || latNum === null) return;

    try {
      markerRef.current.setLngLat([lngNum, latNum]);
      mapRef.current.easeTo({
        center: [lngNum, latNum],
        zoom: 14,
        duration: 300,
      });
    } catch {}
  }, [lngNum, latNum, ready]);

  if (!token) {
    return (
      <div
        className={`flex ${heightClass} items-center justify-center rounded-2xl border border-line bg-muted-surface px-6 text-center text-sm text-muted-ink`}
      >
        {t("search.mapMissingToken")}
      </div>
    );
  }

  if (lngNum === null || latNum === null) {
    return (
      <div
        className={`flex ${heightClass} items-center justify-center rounded-2xl border border-line bg-muted-surface px-6 text-center text-sm text-muted-ink`}
      >
        {t("search.locationMissing")}
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line bg-muted-surface ${heightClass}`}
    >
      <div ref={viewportRef} className="w-full h-full" />
    </div>
  );
}
