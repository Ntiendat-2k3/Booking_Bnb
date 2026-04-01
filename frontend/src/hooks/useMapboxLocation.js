import { useState, useEffect, useRef } from "react";

export function pickFromContext(feature, type) {
  const ctx = feature?.context || [];
  const found = ctx.find((c) => (c.id || "").startsWith(type + "."));
  return found?.text || "";
}

export function asNum(v) {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export async function geocodeForward(q, token, signal) {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&autocomplete=true&limit=6&language=vi`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Mapbox geocoding failed");
  return res.json();
}

export async function geocodeReverse(lng, lat, token, signal) {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1&language=vi`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Mapbox reverse geocoding failed");
  return res.json();
}

export function useMapboxAutocomplete({ token, initialQuery, onSelect }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [suggestions, setSuggestions] = useState([]);
  const [openSug, setOpenSug] = useState(false);
  const [loadingSug, setLoadingSug] = useState(false);

  const wrapperRef = useRef(null);
  const suppressRef = useRef(false);

  // Sync internal query
  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  // Click outside to close
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

  // Fetch suggestions
  useEffect(() => {
    if (!token) return;

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
    const ac = new AbortController();

    const t = setTimeout(async () => {
      try {
        const data = await geocodeForward(q, token, ac.signal);
        setSuggestions(data?.features || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSug(false);
      }
    }, 300);

    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [query, token, openSug]);

  const selectFeature = (f) => {
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

    onSelect?.(next);
    setTimeout(() => {
      suppressRef.current = false;
    }, 600);
  };

  return {
    query,
    setQuery,
    suggestions,
    openSug,
    setOpenSug,
    loadingSug,
    wrapperRef,
    suppressRef,
    selectFeature
  };
}
