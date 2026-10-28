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
export async function geocodeForward(query, token, signal, language = "vi", options = {}) {
  const params = new URLSearchParams({ access_token: token, autocomplete: String(options.autocomplete !== false), limit: "6", language });
  if (options.types) params.set("types", options.types);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
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
/** Debounce 300 ms, hủy truy vấn cũ và giữ tối đa 10 kết quả địa danh công khai trong một phút ở ô đang nhập. */
export function useMapboxAutocomplete({ token, initialQuery = "", onSelect, types, minLength = 3 }) {
  const { locale } = useLocale();
  const [draft, setDraft] = useState({ source: initialQuery, value: initialQuery });
  const query = draft.source === initialQuery ? draft.value : initialQuery;
  const setQuery = (value) => setDraft({ source: initialQuery, value });
  const [result, setResult] = useState({ key: "", features: [], error: false });
  const recentResults = useRef(new Map());
  const [openSug, setOpenSug] = useState(false);
  const wrapperRef = useRef(null);
  const suppressRef = useRef(false);
  const normalized = query.trim();
  const eligible = Boolean(token && openSug && normalized.length >= minLength);
  const requestKey = JSON.stringify([token, locale, types, normalized]);
  useEffect(() => {
    function onDocMouseDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpenSug(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);
  useEffect(() => {
    if (!eligible) return;
    const cached = recentResults.current.get(requestKey);
    if (cached && Date.now() - cached.receivedAt < 60000) {
      setResult({ key: requestKey, features: cached.features, error: false });
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await geocodeForward(normalized, token, controller.signal, locale === "en" ? "en" : "vi", { types });
        if (controller.signal.aborted) return;
        const features = data?.features || [];
        recentResults.current.delete(requestKey);
        recentResults.current.set(requestKey, { features, receivedAt: Date.now() });
        if (recentResults.current.size > 10) recentResults.current.delete(recentResults.current.keys().next().value);
        setResult({ key: requestKey, features, error: false });
      } catch {
        if (!controller.signal.aborted) setResult({ key: requestKey, features: [], error: true });
      }
    }, 300);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [eligible, normalized, token, locale, types, requestKey]);
  const selectFeature = (feature) => {
    setOpenSug(false);
    setQuery(feature?.place_name || query);
    const next = { address: feature?.place_name || query };
    const type = feature?.place_type?.[0];
    const city =
      (type === "place" ? feature.text : "") ||
      pickFromContext(feature, "place") ||
      (type === "locality" ? feature.text : "") ||
      pickFromContext(feature, "locality") ||
      (type === "region" ? feature.text : "") ||
      pickFromContext(feature, "region");
    const country = (type === "country" ? feature.text : "") || pickFromContext(feature, "country");
    if (city) next.city = city;
    if (country) next.country = country;
    if (feature?.center?.length >= 2) { next.lng = String(feature.center[0]); next.lat = String(feature.center[1]); }
    onSelect?.(next);
  };
  return { query, setQuery, suggestions: eligible && result.key === requestKey ? result.features : [], openSug, setOpenSug, loadingSug: eligible && result.key !== requestKey, suggestionError: eligible && result.key === requestKey && result.error, wrapperRef, suppressRef, selectFeature };
}
