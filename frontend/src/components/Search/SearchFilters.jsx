"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NavigationArrow } from "@phosphor-icons/react";
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
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <InputField
          label={t("search.city")}
          value={form.city}
          onChange={(e) => setField("city", e.target.value)}
          placeholder={t("search.cityPlaceholder")}
          className="xl:col-span-2"
        />
        <InputField
          label={t("search.minPrice")}
          type="number"
          min="0"
          value={form.min_price}
          onChange={(e) => setField("min_price", e.target.value)}
          placeholder="500000"
        />
        <InputField
          label={t("search.maxPrice")}
          type="number"
          min="0"
          value={form.max_price}
          onChange={(e) => setField("max_price", e.target.value)}
          placeholder="2000000"
        />
        <InputField
          label={t("search.guests")}
          type="number"
          min="1"
          value={form.guests}
          onChange={(e) => setField("guests", e.target.value)}
          placeholder="2"
        />
        <InputField
          label={t("search.bedrooms")}
          type="number"
          min="1"
          value={form.bedrooms}
          onChange={(e) => setField("bedrooms", e.target.value)}
          placeholder="1"
        />

        <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-6">
          <select
            aria-label={t("search.sortRating")}
            value={form.sort}
            onChange={(e) => setField("sort", e.target.value)}
            className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink outline-none focus:border-ink focus:ring-4 focus:ring-ink/10"
          >
            {SORT_OPTIONS
              .filter((o) => !o.requiresLocation || (form.lat && form.lng))
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
          </select>

          <Button
            onClick={useMyLocation}
            variant="secondary"
            title={t("search.nearMeTitle")}
          >
            <NavigationArrow aria-hidden size={18} />
            {t("search.nearMe")}
          </Button>
          <Button onClick={apply}>{t("search.apply")}</Button>
          <Button onClick={clear} variant="ghost">
            {t("search.clearFilters")}
          </Button>
        </div>
      </div>

      {form.lat && form.lng ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm text-muted-ink">
          <div className="rounded-full bg-muted-surface px-3 py-1.5 font-medium">
            {t("search.nearMeActive")}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="search-radius">{t("search.radius")}</label>
            <input
              id="search-radius"
              type="number"
              min="1"
              value={form.radius_km}
              onChange={(e) => setField("radius_km", e.target.value)}
              className="min-h-10 w-24 rounded-xl border border-line bg-surface px-3 outline-none focus:border-ink focus:ring-4 focus:ring-ink/10"
              placeholder="20"
            />
          </div>
          <Button
            onClick={() => setForm((s) => ({ ...s, lat: "", lng: "", radius_km: "", sort: "rating_desc" }))}
            variant="ghost"
            size="sm"
          >
            {t("search.disableNearMe")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
