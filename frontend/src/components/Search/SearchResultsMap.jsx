"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatVND } from "@/lib/format";
import Button from "@/components/atoms/Button";
import MapPopupCard from "./MapPopupCard";
import { useInViewport } from "@/hooks/useInViewport";
import { getSearchMapColors, getSearchMapLightPreset, getSearchMapStyle } from "./searchMapStyle";
import { canUseMobileBuildings, getSearchMapCameraProfile, getSearchMapFitPadding, getSearchMapFocusOffset } from "./searchMapCamera";
import styles from "./SearchResultsMap.module.css";
import { loadMapbox } from "@/lib/loadMapbox";

const DEFAULT_CENTER = { lng: 106.700987, lat: 10.776889 };

function toNum(v) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export default function SearchResultsMap({ items = [], userLat, userLng, cityCenter, hoveredId, selectedId, focusRequest, onMarkerHover, onMarkerSelect, showPopup = true, expanded = false, heightClass = "h-[520px]" }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const { locale, t } = useLocale();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markerElsRef = useRef(new Map());
  const selectedMarkerIdRef = useRef(null);
  const hoveredMarkerIdRef = useRef(null);
  const userMarkerRef = useRef(null);
  const modeRef = useRef(false);
  const showPopupRef = useRef(showPopup);
  const style3DSupportedRef = useRef(false);
  const objectsEnabledRef = useRef(false);
  const buildingsEnabledRef = useRef(false);
  const mobile3DDegradedRef = useRef(false);
  const gestureActiveRef = useRef(false);
  const pendingCameraRef = useRef(false);
  const profileRef = useRef(null);
  const renderSampleRef = useRef({ last: 0, frames: 0, slow: 0 });
  const { viewportRef, visible } = useInViewport(containerRef);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [threeDSupported, setThreeDSupported] = useState(false);
  const [is3D, setIs3D] = useState(false);

  useEffect(() => { showPopupRef.current = showPopup; }, [showPopup]);

  const user = useMemo(
    () => ({ lat: toNum(userLat), lng: toNum(userLng) }),
    [userLat, userLng],
  );
  const cityLat = cityCenter?.lat;
  const cityLng = cityCenter?.lng;

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
  const activeSelected = selectedId && points.find((point) =>
    String(point.id || point.listing_id || point.uuid || `${point.lng},${point.lat}`) === String(selectedId)
  ) || null;

  const initialCenter = useMemo(() => {
    if (user.lat != null && user.lng != null)
      return { lat: user.lat, lng: user.lng };
    if (cityCenter) return cityCenter;
    if (points.length) return { lat: points[0].lat, lng: points[0].lng };
    return DEFAULT_CENTER;
  }, [user.lat, user.lng, cityCenter, points]);

  const syncBuildings = useCallback((map) => {
    if (!style3DSupportedRef.current) return;
    const profile = profileRef.current;
    if (!profile) return;
    const enabled = modeRef.current && map.getZoom() >= profile.buildingZoom &&
      (profile.device !== "mobile" || (!mobile3DDegradedRef.current && canUseMobileBuildings(window.navigator)));
    if (buildingsEnabledRef.current === enabled) return;
    try {
      map.setConfigProperty("basemap", "show3dBuildings", enabled);
      buildingsEnabledRef.current = enabled;
    } catch {
      style3DSupportedRef.current = false;
      modeRef.current = false;
      setThreeDSupported(false);
      setIs3D(false);
      map.jumpTo({ pitch: 0, bearing: 0 });
    }
  }, []);

  /** Đổi góc nghiêng theo thiết bị mà giữ nguyên tâm, zoom và Mapbox instance. */
  const applyCameraMode = useCallback((animate) => {
    const map = mapRef.current;
    if (!map) return;
    const profile = getSearchMapCameraProfile(window.innerWidth);
    profileRef.current = profile;
    if (gestureActiveRef.current) {
      pendingCameraRef.current = true;
      return;
    }
    try {
      const enabled = modeRef.current && style3DSupportedRef.current;
      if (style3DSupportedRef.current && objectsEnabledRef.current !== enabled) {
        map.setConfigProperty("basemap", "show3dObjects", enabled);
        objectsEnabledRef.current = enabled;
      }
      syncBuildings(map);
    } catch {
      style3DSupportedRef.current = false;
      modeRef.current = false;
      setThreeDSupported(false);
      setIs3D(false);
    }
    const targetPitch = modeRef.current && style3DSupportedRef.current ? profile.pitch : 0;
    if (Math.abs(map.getPitch() - targetPitch) > 0.1 || Math.abs(map.getBearing()) > 0.1) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      map.easeTo({ pitch: targetPitch, bearing: 0, duration: animate && !reducedMotion ? profile.duration : 0 });
    }
    pendingCameraRef.current = false;
  }, [syncBuildings]);

  // Khởi tạo bản đồ đúng một lần cho mỗi token.
  useEffect(() => {
    if (!token || !visible) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    let cancelled = false;

    (async () => {
      const mapboxgl = await loadMapbox();
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        ...getSearchMapStyle(containerRef.current),
        center: [initialCenter.lng, initialCenter.lat],
        zoom: user.lat != null && user.lng != null ? 12 : 11,
        pitch: 0,
        bearing: 0,
        cooperativeGestures: !expanded,
        dragRotate: false,
        touchPitch: false,
        trackResize: false,
      });
      mapRef.current = map;

      map.touchZoomRotate?.disableRotation?.();
      map.keyboard?.disableRotation?.();
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      let loaded = false;
      map.on("error", () => { if (!cancelled && !loaded) setFailed(true); });
      map.on("click", () => onMarkerSelect?.(null));
      map.on("load", () => {
        if (cancelled) return;
        loaded = true;
        setFailed(false);
        try {
          const supported = typeof map.setConfigProperty === "function" &&
            typeof map.getConfigProperty === "function" &&
            typeof map.getConfigProperty("basemap", "show3dObjects") === "boolean" &&
            typeof map.getConfigProperty("basemap", "show3dBuildings") === "boolean";
          style3DSupportedRef.current = supported;
          setThreeDSupported(supported);
        } catch {
          style3DSupportedRef.current = false;
          setThreeDSupported(false);
        }
      });

      if (cancelled) return;
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      mapRef.current?.remove();
      mapRef.current = null;
      setFailed(true);
    });

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
      style3DSupportedRef.current = false;
      objectsEnabledRef.current = false;
      buildingsEnabledRef.current = false;
      mobile3DDegradedRef.current = false;
      gestureActiveRef.current = false;
      pendingCameraRef.current = false;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, visible]);

  // Cập nhật màu nền khi đổi light/dark mà không tải lại style hay tạo map mới.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || typeof map.setConfigProperty !== "function") return;
    const updateColors = () => {
      try {
        Object.entries(getSearchMapColors(containerRef.current)).forEach(([key, value]) => {
          map.setConfigProperty("basemap", key, value);
        });
        map.setConfigProperty("basemap", "lightPreset", getSearchMapLightPreset(containerRef.current));
      } catch { setThreeDSupported(false); }
    };
    if (map.isStyleLoaded?.()) updateColors();
    else map.once?.("load", updateColors);
    return () => map.off?.("load", updateColors);
  }, [ready, resolvedTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    profileRef.current = getSearchMapCameraProfile(window.innerWidth);
    let resizeFrame = null;
    const resize = () => {
      resizeFrame = null;
      if (mapRef.current !== map) return;
      map.resize();
      applyCameraMode(true);
    };
    const scheduleResize = () => {
      if (resizeFrame !== null) return;
      if (typeof window.requestAnimationFrame === "function") resizeFrame = window.requestAnimationFrame(resize);
      else resize();
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleResize);
    observer?.observe(containerRef.current);
    window.addEventListener?.("resize", scheduleResize);

    const onGestureStart = (event) => {
      if (event.originalEvent) gestureActiveRef.current = true;
    };
    const onMoveEnd = () => {
      gestureActiveRef.current = false;
      if (pendingCameraRef.current) applyCameraMode(true);
      else syncBuildings(map);
    };
    const onZoom = () => syncBuildings(map);
    const onRender = () => {
      const sample = renderSampleRef.current;
      // Chỉ đo lúc map chuyển động để thời gian nghỉ không bị tính là khung hình chậm.
      if (!buildingsEnabledRef.current || profileRef.current.device !== "mobile" || !map.isMoving?.()) {
        sample.last = 0;
        sample.frames = 0;
        sample.slow = 0;
        return;
      }
      const now = window.performance?.now?.() ?? Date.now();
      if (sample.last) {
        const gap = now - sample.last;
        if (gap < 250) {
          sample.frames++;
          if (gap > 45) sample.slow++;
        }
      }
      sample.last = now;
      if (sample.frames >= 12) {
        // Tắt tòa nhà khi ít nhất 8/12 khung hình vượt 45 ms; vẫn giữ chế độ nghiêng.
        if (sample.slow >= 8) {
          mobile3DDegradedRef.current = true;
          syncBuildings(map);
        }
        sample.last = 0;
        sample.frames = 0;
        sample.slow = 0;
      }
    };
    map.on("dragstart", onGestureStart);
    map.on("zoomstart", onGestureStart);
    map.on("moveend", onMoveEnd);
    map.on("zoom", onZoom);
    map.on("render", onRender);
    applyCameraMode(false);

    return () => {
      observer?.disconnect();
      window.removeEventListener?.("resize", scheduleResize);
      if (resizeFrame !== null) window.cancelAnimationFrame?.(resizeFrame);
      map.off("dragstart", onGestureStart);
      map.off("zoomstart", onGestureStart);
      map.off("moveend", onMoveEnd);
      map.off("zoom", onZoom);
      map.off("render", onRender);
    };
  }, [ready, threeDSupported, applyCameraMode, syncBuildings]);

  function toggle3D() {
    const map = mapRef.current;
    if (!map || !threeDSupported) return;
    modeRef.current = !modeRef.current;
    setIs3D(modeRef.current);
    applyCameraMode(true);
  }

  // Đồng bộ trạng thái trực quan của ghim đang được chọn.
  useEffect(() => {
    selectedMarkerIdRef.current = selectedId && String(selectedId);
    hoveredMarkerIdRef.current = hoveredId && String(hoveredId);
    markerElsRef.current.forEach(({ root, button }, id) => {
      const selected = id === selectedMarkerIdRef.current;
      const hovered = id === hoveredMarkerIdRef.current;
      button.dataset.selected = String(selected);
      button.dataset.hovered = String(hovered);
      root.classList.toggle(styles.markerSelected, selected);
      root.classList.toggle(styles.markerAbove, hovered && !selected);
    });
  }, [hoveredId, selectedId]);

  // Thêm hoặc cập nhật vị trí hiện tại của người dùng.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    let cancelled = false;
    if (user.lat == null || user.lng == null) {
      try {
        userMarkerRef.current?.remove();
      } catch {}
      userMarkerRef.current = null;
      return;
    }

    (async () => {
      const mapboxgl = await loadMapbox();
      if (cancelled || mapRef.current !== map) return;
      const el = document.createElement("div");
      el.className = styles.userMarker;
      try {
        userMarkerRef.current?.remove();
      } catch {}
      userMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([user.lng, user.lat])
        .addTo(map);
    })();
    return () => { cancelled = true; };
  }, [ready, user.lat, user.lng]);

  // Chỉ dựng lại ghim khi dữ liệu hoặc ngôn ngữ giá đổi; hover và chọn chỉ sửa trạng thái DOM.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    let cancelled = false;
    const clearMarkers = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      markerElsRef.current.clear();
    };
    clearMarkers();

    (async () => {
      const mapboxgl = await loadMapbox();
      if (cancelled || mapRef.current !== map) return;
      points.forEach((it) => {
        const id = it?.id || it?.listing_id || it?.uuid;
        const markerId = String(id ?? `${it.lng},${it.lat}`);
        const root = document.createElement("div");
        root.className = styles.markerRoot;
        const pill = document.createElement("button");
        pill.type = "button";
        pill.className = styles.priceMarker;
        pill.dataset.selected = String(selectedMarkerIdRef.current === markerId);
        pill.dataset.hovered = String(hoveredMarkerIdRef.current === markerId);
        root.classList.toggle(styles.markerSelected, pill.dataset.selected === "true");
        root.classList.toggle(styles.markerAbove, pill.dataset.hovered === "true" && pill.dataset.selected !== "true");
        const price = formatVND(it.price_per_night || it.price || 0, locale === "en" ? "en-US" : "vi-VN");
        pill.setAttribute("aria-label", `${it.title}: ${price}`);
        pill.textContent = price;
        root.append(pill);

        pill.addEventListener("pointerenter", () => onMarkerHover?.(markerId));
        pill.addEventListener("pointerleave", () => onMarkerHover?.(null));
        pill.addEventListener("focus", () => onMarkerHover?.(markerId));
        pill.addEventListener("blur", () => onMarkerHover?.(null));

        pill.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onMarkerSelect?.(markerId);
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          map.easeTo({
            center: [it.lng, it.lat],
            zoom: Math.max(map.getZoom(), 15),
            offset: getSearchMapFocusOffset(containerRef.current, showPopupRef.current),
            duration: reducedMotion ? 0 : 350,
          });
        });

        markerElsRef.current.set(markerId, { root, button: pill });
        const m = new mapboxgl.Marker({ element: root, anchor: "bottom" })
          .setLngLat([it.lng, it.lat])
          .addTo(map);
        markersRef.current.push(m);
      });
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; clearMarkers(); };
  }, [locale, points, ready, onMarkerHover, onMarkerSelect]);

  // Căn camera khi bộ lọc hoặc thẻ phòng thay đổi mà không chạm vào marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const focused = focusRequest?.sequence && points.find((point) => String(point.id) === String(focusRequest.id));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (focused) {
      map.easeTo({
        center: [focused.lng, focused.lat],
        zoom: Math.max(map.getZoom(), 13),
        offset: getSearchMapFocusOffset(containerRef.current, showPopupRef.current),
        duration: reducedMotion ? 0 : 450,
      });
      return;
    }
    if (!points.length) {
      const center = user.lat != null && user.lng != null ? user : cityLat != null && cityLng != null ? { lat: cityLat, lng: cityLng } : DEFAULT_CENTER;
      map.easeTo({ center: [center.lng, center.lat], zoom: user.lat != null ? 12 : 11, duration: 0 });
      return;
    }
    if (cityLat != null && cityLng != null && (user.lat == null || user.lng == null)) {
      map.easeTo({ center: [cityLng, cityLat], zoom: 11, duration: reducedMotion ? 0 : 350 });
      return;
    }
    const locations = [...points, ...(user.lat != null && user.lng != null ? [user] : [])];
    const latitudes = locations.map((point) => point.lat);
    const longitudes = locations.map((point) => point.lng);
    map.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], {
      padding: getSearchMapFitPadding(containerRef.current),
      retainPadding: false,
      duration: 0,
      maxZoom: 13,
    });
  }, [ready, points, user, cityLat, cityLng, focusRequest]);

  if (!token) {
    return (
      <div className={`flex ${heightClass} items-center justify-center p-6 text-center text-sm leading-6 text-muted-ink`}>
        {t("search.mapMissingToken")}
      </div>
    );
  }

  return (
    <div className={`${styles.mapSurface} relative w-full ${heightClass}`}>
      <div ref={viewportRef} className="w-full h-full" />
      {threeDSupported ? (
        <Button type="button" size="sm" variant="secondary" aria-pressed={is3D} aria-label={is3D ? t("search.switchTo2D") : t("search.switchTo3D")} onClick={toggle3D} className="absolute left-3 top-3 z-10 min-w-11 !px-3 shadow-soft">
          {is3D ? "2D" : "3D"}
        </Button>
      ) : null}
      {failed ? <p role="alert" className="absolute inset-x-3 top-3 rounded-xl bg-surface p-3 text-sm">{t("address.mapError")}</p> : null}
      {showPopup ? <MapPopupCard listing={activeSelected} onClose={() => onMarkerSelect?.(null)} /> : null}
    </div>
  );
}
