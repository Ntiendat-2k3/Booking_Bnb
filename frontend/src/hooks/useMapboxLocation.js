import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

export function pickFromContext(feature, type) {
  return feature?.context?.find((item) => item.id?.startsWith(type + "."))?.text || "";
}
export function asNum(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export async function geocodeForward(query, token, signal, language = "vi") {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(token)}&autocomplete=true&limit=6&language=${language}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Mapbox geocoding failed");
  return response.json();
}
export async function geocodeReverse(lng, lat, token, signal, language = "vi") {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(token)}&limit=1&language=${language}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Mapbox reverse geocoding failed");
  return response.json();
}
/** Giữ địa chỉ đang nhập, hủy truy vấn cũ và chỉ hiển thị gợi ý khớp với nội dung hiện tại. */
export function useMapboxAutocomplete({ token, initialQuery = "", onSelect }) {
  const { locale } = useLocale();
  const [draft, setDraft] = useState({ source: initialQuery, value: initialQuery });
  const query = draft.source === initialQuery ? draft.value : initialQuery;
  const setQuery = (value) => setDraft({ source: initialQuery, value });
  const [result, setResult] = useState({ query: "", features: [], error: false });
  const [openSug, setOpenSug] = useState(false);
  const wrapperRef = useRef(null);
  const suppressRef = useRef(false);
  const normalized = query.trim();
  const eligible = Boolean(token && openSug && normalized.length >= 3);
  useEffect(() => {
    function onDocMouseDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpenSug(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);
  useEffect(() => {
    if (!token || !openSug || normalized.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await geocodeForward(normalized, token, controller.signal, locale === "en" ? "en" : "vi");
        if (!controller.signal.aborted) setResult({ query: normalized, features: data?.features || [], error: false });
      } catch {
        if (!controller.signal.aborted) setResult({ query: normalized, features: [], error: true });
      }
    }, 300);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [normalized, token, openSug, locale]);
  const selectFeature = (feature) => {
    setOpenSug(false);
    setQuery(feature?.place_name || query);
    const next = { address: feature?.place_name || query };
    const city = pickFromContext(feature, "place");
    const country = pickFromContext(feature, "country");
    if (city) next.city = city;
    if (country) next.country = country;
    if (feature?.center?.length >= 2) { next.lng = String(feature.center[0]); next.lat = String(feature.center[1]); }
    onSelect?.(next);
  };
  return { query, setQuery, suggestions: eligible && result.query === normalized ? result.features : [], openSug, setOpenSug, loadingSug: eligible && result.query !== normalized, suggestionError: eligible && result.query === normalized && result.error, wrapperRef, suppressRef, selectFeature };
}
