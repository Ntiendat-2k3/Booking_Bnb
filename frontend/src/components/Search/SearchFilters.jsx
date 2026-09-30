"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NavigationArrow, SlidersHorizontal, MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { notifyError, notifyInfo } from "@/lib/notify";
import { SORT_OPTIONS } from "@/lib/constants";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";

export default function SearchFilters() {
  const params = useSearchParams();
  const paramsKey = params.toString();

  return <SearchFiltersForm key={paramsKey} params={params} />;
}

function SearchFiltersForm({ params }) {
  const router = useRouter();
  const t = useTranslations();
  const [form, setForm] = useState(() => ({
    city: params.get("city") || "",
    min_price: params.get("min_price") || "",
    max_price: params.get("max_price") || "",
    guests: params.get("guests") || "",
    bedrooms: params.get("bedrooms") || "",
    sort: params.get("sort") || "rating_desc",
    // Bộ lọc vị trí dùng chung với tìm kiếm gần đây.
    lat: params.get("lat") || "",
    lng: params.get("lng") || "",
    radius_km: params.get("radius_km") || "",
  }));

  function setField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function apply() {
    const q = new URLSearchParams(params.toString());
    q.delete("page");
    Object.entries(form).forEach(([k, v]) => {
      if (v !== "" && v != null) q.set(k, v);
      else q.delete(k);
    });
    router.push("/search?" + q.toString());
  }

  function clear() {
    router.push("/search");
  }

  function useMyLocation() {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      notifyError(t("search.locationUnsupported"));
      return;
    }

    notifyInfo(t("search.locationLoading"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (latitude == null || longitude == null) {
          notifyError(t("search.locationMissing"));
          return;
        }
        const next = {
          ...form,
          lat: String(latitude),
          lng: String(longitude),
          radius_km: form.radius_km || "20",
          sort: "distance_asc",
        };
        setForm(next);

        const q = new URLSearchParams(params.toString());
        q.delete("page");
        Object.entries(next).forEach(([k, v]) => {
          if (v !== "" && v != null) q.set(k, v);
        });
        router.push("/search?" + q.toString());
      },
      (err) => {
        if (err?.code === 1) notifyError(t("search.locationDenied"));
        else if (err?.code === 2) notifyError(t("search.locationUnavailable"));
        else if (err?.code === 3) notifyError(t("search.locationTimeout"));
        else notifyError(err?.message || t("search.locationError"));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); apply(); }} aria-label={t("search.filterTitle")} className="surface-panel p-4 sm:p-6">
      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
        <InputField label={t("search.city")} value={form.city} onChange={(event) => setField("city", event.target.value)} placeholder={t("search.cityPlaceholder")} />
        <InputField label={t("search.guests")} type="number" min="1" step="1" value={form.guests} onChange={(event) => setField("guests", event.target.value)} placeholder={t("search.guestsPlaceholder")} />
        <Button type="submit" className="sm:col-span-2 lg:col-span-1"><MagnifyingGlass aria-hidden size={18} />{t("search.apply")}</Button>
      </div>

      <details className="mt-5 border-t border-line pt-4" open={Boolean(params.get("min_price") || params.get("max_price") || params.get("bedrooms") || params.get("lat"))}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal aria-hidden size={20} />{t("search.showFilters")}
        </summary>
        <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <InputField label={t("search.minPrice")} type="number" min="0" value={form.min_price} onChange={(event) => setField("min_price", event.target.value)} placeholder={t("search.minPrice")} />
          <InputField label={t("search.maxPrice")} type="number" min="0" value={form.max_price} onChange={(event) => setField("max_price", event.target.value)} placeholder={t("search.maxPrice")} />
          <InputField label={t("search.bedrooms")} type="number" min="1" step="1" value={form.bedrooms} onChange={(event) => setField("bedrooms", event.target.value)} />
          <div className="space-y-2">
            <label htmlFor="search-sort" className="block text-sm font-semibold text-ink">{t("search.sortRating")}</label>
            <select id="search-sort" value={form.sort} onChange={(event) => setField("sort", event.target.value)} className="field-control">
              {SORT_OPTIONS.filter((option) => !option.requiresLocation || (form.lat && form.lng)).map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={useMyLocation} variant="secondary" title={t("search.nearMeTitle")}><NavigationArrow aria-hidden size={18} />{t("search.nearMe")}</Button>
          <Button onClick={clear} variant="ghost">{t("search.clearFilters")}</Button>
        </div>
      </details>

      {form.lat && form.lng ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm text-muted-ink">
          <span className="rounded-full bg-muted-surface px-3 py-2 font-medium">{t("search.nearMeActive")}</span>
          <InputField id="search-radius" label={t("search.radius")} type="number" min="1" value={form.radius_km} onChange={(event) => setField("radius_km", event.target.value)} className="max-w-32" />
          <Button onClick={() => setForm((previous) => ({ ...previous, lat: "", lng: "", radius_km: "", sort: "rating_desc" }))} variant="ghost" size="sm">{t("search.disableNearMe")}</Button>
        </div>
      ) : null}
    </form>
  );
}
