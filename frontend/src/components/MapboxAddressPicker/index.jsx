"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { asNum, geocodeReverse, pickFromContext } from "@/hooks/useMapboxLocation";
import { useLocale } from "@/i18n/LocaleProvider";
import AddressAutocomplete from "./AddressAutocomplete";
import CoordinatesInputs from "./CoordinatesInputs";
import "mapbox-gl/dist/mapbox-gl.css";
const DEFAULT_CENTER = { lng: 106.700987, lat: 10.776889 };

/** Đồng bộ marker với form; dùng giá trị mới nhất khi người dùng kéo marker hoặc chọn trên bản đồ. */
export default function MapboxAddressPicker({ address, city, country, lat, lng, onChange, label }) {
  const { locale, t } = useLocale();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const latestRef = useRef({ city, country, lat, lng, onChange, locale });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const latitude = useMemo(() => asNum(lat), [lat]);
  const longitude = useMemo(() => asNum(lng), [lng]);
  useEffect(() => { latestRef.current = { city, country, lat, lng, onChange, locale }; }, [city, country, lat, lng, onChange, locale]);
  useEffect(() => {
    if (!token || !containerRef.current) return;
    let cancelled = false;
    const controller = new AbortController();
    async function initialize() {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current) return;
        const current = latestRef.current;
        const initialLat = asNum(current.lat);
        const initialLng = asNum(current.lng);
        const hasCoordinates = initialLat !== null && initialLng !== null;
        const center = hasCoordinates ? [initialLng, initialLat] : [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];
        const map = new mapboxgl.Map({ accessToken: token, container: containerRef.current, style: "mapbox://styles/mapbox/streets-v12", center, zoom: hasCoordinates ? 14 : 12 });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        const marker = new mapboxgl.Marker({ draggable: true }).setLngLat(center).addTo(map);
        markerRef.current = marker;
        async function updateAddress(point) {
          if (cancelled) return;
          latestRef.current.onChange?.({ lng: String(point.lng), lat: String(point.lat) });
          try {
            const data = await geocodeReverse(point.lng, point.lat, token, controller.signal, latestRef.current.locale === "en" ? "en" : "vi");
            const feature = data?.features?.[0];
            if (!cancelled && feature?.place_name) latestRef.current.onChange?.({ address: feature.place_name, city: pickFromContext(feature, "place") || latestRef.current.city, country: pickFromContext(feature, "country") || latestRef.current.country });
          } catch { /* Tọa độ vẫn dùng được nếu dịch vụ tra địa chỉ gặp lỗi. */ }
        }
        marker.on("dragend", () => updateAddress(marker.getLngLat()));
        map.on("click", (event) => { marker.setLngLat([event.lngLat.lng, event.lngLat.lat]); updateAddress(event.lngLat); });
        map.on("error", () => { if (!cancelled) setFailed(true); });
        map.on("load", () => { if (!cancelled) { setReady(true); setFailed(false); } });
      } catch { if (!cancelled) setFailed(true); }
    }
    initialize();
    return () => { cancelled = true; controller.abort(); mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  }, [token]);
  useEffect(() => {
    if (!ready || latitude === null || longitude === null || !mapRef.current || !markerRef.current) return;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;
    markerRef.current.setLngLat([longitude, latitude]);
    mapRef.current.easeTo({ center: [longitude, latitude], zoom: 14, duration: 200 });
  }, [latitude, longitude, ready]);
  return <div className="space-y-4">
    <AddressAutocomplete label={label || t("address.label")} address={address} onChange={onChange} token={token} />
    <CoordinatesInputs city={city} country={country} lat={lat} lng={lng} onChange={onChange} token={token} />
    {token ? <><div className="overflow-hidden rounded-2xl border border-line bg-muted-surface"><div ref={containerRef} className="h-64 w-full" /></div><p role={failed ? "alert" : undefined} className="text-xs leading-5 text-muted-ink">{t(failed ? "address.mapError" : "address.mapHint")}</p></> : <p className="text-xs leading-5 text-muted-ink">{t("address.unavailable")}</p>}
  </div>;
}
