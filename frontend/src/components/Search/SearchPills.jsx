"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CalendarBlank,
  MagnifyingGlass,
  MapPin,
  Users,
} from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";

const POPULAR_CITIES = [
  { value: "Hà Nội", labelKey: "destinations.hanoi" },
  { value: "Hồ Chí Minh", labelKey: "destinations.hcm" },
  { value: "Đà Nẵng", labelKey: "destinations.danang" },
  { value: "Đà Lạt", labelKey: "destinations.dalat" },
  { value: "Vũng Tàu", labelKey: "destinations.vungtau" },
  { value: "Nha Trang", labelKey: "destinations.nhatrang" },
  { value: "Sapa", labelKey: "destinations.sapa" },
  { value: "Hội An", labelKey: "destinations.hoian" },
  { value: "Phú Quốc", labelKey: "destinations.phuquoc" },
  { value: "Ninh Bình", labelKey: "destinations.ninhbinh" },
  { value: "Vịnh Hạ Long", labelKey: "destinations.halong" },
  { value: "Quy Nhơn", labelKey: "destinations.quynhon" },
  { value: "Cần Thơ", labelKey: "destinations.cantho" },
  { value: "Huế", labelKey: "destinations.hue" },
];

export default function SearchPills({ variant = "compact" }) {
  const router = useRouter();
  const t = useTranslations();
  const [city, setCity] = useState("");
  const [dates, setDates] = useState("");
  const [guests, setGuests] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const filteredCities = useMemo(() => {
    if (!city) return POPULAR_CITIES;
    const lower = city.toLowerCase();
    return POPULAR_CITIES.filter((c) => c.value.toLowerCase().includes(lower) || t(c.labelKey).toLowerCase().includes(lower));
  }, [city, t]);

  function onSearch() {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (guests) params.set("guests", guests);
    router.push("/search?" + params.toString());
  }

  return (
    <div
      className={
        "relative z-30 grid w-full items-center border border-line bg-surface shadow-soft " +
        (variant === "hero"
          ? "gap-1 rounded-2xl p-2 md:grid-cols-[1.4fr_1fr_0.8fr_auto] md:rounded-full"
          : "max-w-2xl grid-cols-[1.25fr_1fr_0.8fr_auto] rounded-full")
      }
    >
      <div className="relative min-w-0 px-4 py-2" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setShowAutocomplete(false); }}>
        <label htmlFor={`search-city-${variant}`} className={variant === "compact" ? "sr-only" : "flex items-center gap-1.5 text-xs font-bold text-ink"}>
          <MapPin aria-hidden size={15} />
          {t("search.destination")}
        </label>
        <input
          id={`search-city-${variant}`}
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setShowAutocomplete(true);
          }}
          onFocus={() => setShowAutocomplete(true)}
          placeholder={t("search.destinationPlaceholder")}
          autoComplete="off"
          className={`${variant === "hero" ? "mt-1" : ""} w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted-ink/70`}
        />
        {showAutocomplete && (
          <div className="absolute left-0 top-[calc(100%+12px)] z-50 max-h-80 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-float">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-ink">
              {filteredCities.length > 0
                ? t("search.suggestions")
                : t("search.noSuggestion")}
            </div>
            {filteredCities.map((c) => (
              <button
                type="button"
                key={c.value}
                onClick={(e) => {
                  e.preventDefault();
                  setCity(c.value);
                  setShowAutocomplete(false);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-muted-surface"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted-surface text-muted-ink">
                  <MapPin aria-hidden size={18} />
                </span>
                <span>{t(c.labelKey)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 border-t border-line px-4 py-2 md:border-l md:border-t-0">
        <label htmlFor={`search-date-${variant}`} className={variant === "compact" ? "sr-only" : "flex items-center gap-1.5 text-xs font-bold text-ink"}>
          <CalendarBlank aria-hidden size={15} />
          {t("search.checkIn")}
        </label>
        <input
          id={`search-date-${variant}`}
          type="date"
          value={dates}
          onChange={(e) => setDates(e.target.value)}
          className={`${variant === "hero" ? "mt-1" : ""} w-full min-w-0 bg-transparent text-sm text-ink outline-none`}
        />
      </div>

      <div className="min-w-0 border-t border-line px-4 py-2 md:border-l md:border-t-0">
        <label htmlFor={`search-guests-${variant}`} className={variant === "compact" ? "sr-only" : "flex items-center gap-1.5 text-xs font-bold text-ink"}>
          <Users aria-hidden size={15} />
          {t("search.guests")}
        </label>
        <input
          id={`search-guests-${variant}`}
          type="number"
          min="1"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          placeholder={t("search.guestsPlaceholder")}
          className={`${variant === "hero" ? "mt-1" : ""} w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted-ink/70`}
        />
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="m-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 md:rounded-full"
        aria-label={t("common.search")}
      >
        <MagnifyingGlass aria-hidden size={20} weight="bold" />
        {variant === "hero" ? <span>{t("common.search")}</span> : null}
      </button>
    </div>
  );
}
