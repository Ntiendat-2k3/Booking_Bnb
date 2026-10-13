"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowsOut, MapTrifold, X } from "@phosphor-icons/react";
import IconButton from "@/components/atoms/IconButton";
import { useLocale } from "@/i18n/LocaleProvider";
import { asNum, geocodeForward } from "@/hooks/useMapboxLocation";
import SearchResultsMap from "./SearchResultsMap";

/** Dùng một tâm địa danh cho bản đồ nhỏ và bản đồ mở rộng, tách khỏi tọa độ lọc gần tôi. */
export default function SearchMapPanel({ items, city, mapLat, mapLng, userLat, userLng, hoveredId, selectedId, focusRequest, expanded, onExpandedChange, onMarkerHover, onMarkerSelect }) {
  const { locale, t } = useLocale();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const dialogRef = useRef(null);
  const [resolved, setResolved] = useState(null);
  const query = city?.trim() || "";
  const latitude = asNum(mapLat);
  const longitude = asNum(mapLng);
  const hasSelectedCenter = latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const hasUserCenter = asNum(userLat) !== null && asNum(userLng) !== null;
  const cityCenter = hasSelectedCenter
    ? { lat: latitude, lng: longitude }
    : resolved?.query === query ? resolved.center : null;

  useEffect(() => {
    if (!token || !query || hasSelectedCenter || hasUserCenter) return;
    const controller = new AbortController();
    geocodeForward(query, token, controller.signal, locale === "en" ? "en" : "vi", {
      types: "place,locality,region",
      autocomplete: false,
    }).then((data) => {
      const center = data?.features?.[0]?.center;
      const lng = asNum(center?.[0]);
      const lat = asNum(center?.[1]);
      if (!controller.signal.aborted) {
        setResolved({ query, center: lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setResolved({ query, center: null });
    });
    return () => controller.abort();
  }, [token, query, hasSelectedCenter, hasUserCenter, locale]);

  useEffect(() => {
    if (!expanded) return;
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [expanded]);

  const mapProps = { items, userLat, userLng, cityCenter, hoveredId, selectedId, focusRequest, onMarkerHover, onMarkerSelect };

  return (
    <>
      <div className="surface-panel sticky top-24 overflow-hidden p-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-3 text-sm font-semibold text-ink">
          <span className="flex items-center gap-2"><MapTrifold aria-hidden size={18} />{t("search.map")}</span>
          <IconButton label={t("search.expandMap")} title={t("search.expandMap")} onClick={() => onExpandedChange(true)} className="!h-9 !w-9">
            <ArrowsOut aria-hidden size={18} />
          </IconButton>
        </div>
        <div className="overflow-hidden rounded-control bg-muted-surface">
          <SearchResultsMap {...mapProps} showPopup={!expanded} />
        </div>
      </div>

      {expanded ? (
        <dialog
          ref={dialogRef}
          onCancel={(event) => { event.preventDefault(); onExpandedChange(false); }}
          className="fixed inset-0 z-[100] m-0 flex h-dvh w-screen max-w-none items-center justify-center bg-transparent p-3 backdrop:bg-black/70 [&:not([open])]:hidden sm:p-6"
          aria-labelledby="search-map-dialog-title"
        >
          <div className="surface-panel w-full max-w-6xl overflow-hidden p-3 shadow-float sm:p-4">
            <div className="flex items-center justify-between gap-3 px-1 pb-3">
              <h2 id="search-map-dialog-title" className="flex items-center gap-2 text-lg font-semibold text-ink">
                <MapTrifold aria-hidden size={22} />{t("search.map")}
              </h2>
              <IconButton label={t("common.close")} onClick={() => onExpandedChange(false)}>
                <X aria-hidden size={20} />
              </IconButton>
            </div>
            <div className="overflow-hidden rounded-control bg-muted-surface">
              <SearchResultsMap {...mapProps} expanded heightClass="h-[min(76dvh,760px)]" />
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
