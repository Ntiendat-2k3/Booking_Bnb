"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { asNum, geocodeReverse, pickFromContext } from "@/hooks/useMapboxLocation";
import AddressAutocomplete from "./AddressAutocomplete";
import CoordinatesInputs from "./CoordinatesInputs";

const DEFAULT_CENTER = { lng: 106.700987, lat: 10.776889 }; // HCMC
const DEFAULT_ZOOM = 12;

export default function MapboxAddressPicker({
  address,
  city,
  country,
  lat,
  lng,
  onChange,
  label = "Địa chỉ",
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);

  const latNum = useMemo(() => asNum(lat), [lat]);
  const lngNum = useMemo(() => asNum(lng), [lng]);

  // init map
  useEffect(() => {
    if (!token) return;
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;
    const ac = new AbortController();

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
          const rev = await geocodeReverse(ll.lng, ll.lat, token, ac.signal);
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
          const rev = await geocodeReverse(ll.lng, ll.lat, token, ac.signal);
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
      ac.abort();
      try {
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [token]);

  // Whenever lat/lng change from outside, update map
  useEffect(() => {
    if (!mapReady) return;
    if (!mapRef.current || !markerRef.current) return;
    if (lngNum === null || latNum === null) return;

    try {
      markerRef.current.setLngLat([lngNum, latNum]);
      mapRef.current.easeTo({ center: [lngNum, latNum], zoom: 14, duration: 300 });
    } catch {}
  }, [lngNum, latNum, mapReady]);

  return (
    <div className="space-y-3">
      <AddressAutocomplete
        label={label}
        address={address}
        onChange={onChange}
        token={token}
      />
      
      <CoordinatesInputs
        city={city}
        country={country}
        lat={lat}
        lng={lng}
        onChange={onChange}
        token={token}
      />

      <div className="overflow-hidden rounded-2xl border bg-slate-50">
        <div ref={mapContainerRef} className="h-64 w-full" />
      </div>

      <div className="text-xs text-slate-500">
        Tip: Click map để đặt marker, kéo marker để đổi vị trí. Vị trí sẽ tự reverse-geocode về địa chỉ.
      </div>
    </div>
  );
}
