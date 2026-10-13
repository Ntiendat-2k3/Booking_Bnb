"use client";

import { useId } from "react";
import { MapPin } from "@phosphor-icons/react";
import InputField from "@/components/atoms/InputField";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useMapboxAutocomplete } from "@/hooks/useMapboxLocation";

/** Gợi ý địa danh từ Mapbox nhưng chỉ đưa tên thành phố vào bộ lọc phòng. */
export default function CityAutocomplete({ value, onChange, onSelect, label, placeholder, variant, name }) {
  const t = useTranslations();
  const listId = useId();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const {
    query, setQuery, suggestions, openSug, setOpenSug, loadingSug,
    suggestionError, wrapperRef, selectFeature,
  } = useMapboxAutocomplete({
    token,
    initialQuery: value,
    types: "place,locality,region",
    minLength: 2,
    onSelect: (place) => {
      const city = place.city || place.address?.split(",")[0]?.trim() || "";
      onChange(city);
      onSelect?.({ city, lat: place.lat, lng: place.lng });
    },
  });
  const showSuggestions = Boolean(token && openSug && query.trim().length >= 2);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenSug(false); }}
    >
      <InputField
        label={label}
        name={name}
        variant={variant}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showSuggestions}
        onFocus={() => setOpenSug(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpenSug(false);
          if (event.key === "ArrowDown" && suggestions.length) {
            event.preventDefault();
            wrapperRef.current?.querySelector('[role="option"]')?.focus();
          }
        }}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setOpenSug(true);
          onChange(next);
        }}
      />
      {showSuggestions ? (
        <div id={listId} role="listbox" className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-control border border-line bg-surface p-1 shadow-float">
          {suggestions.map((feature) => (
            <button
              key={feature.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => selectFeature(feature)}
              onKeyDown={(event) => {
                if (event.key === "Escape") { setOpenSug(false); wrapperRef.current?.querySelector('input')?.focus(); }
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const options = [...wrapperRef.current.querySelectorAll('[role="option"]')];
                  const index = options.indexOf(event.currentTarget);
                  options[index + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
                }
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-ink hover:bg-muted-surface focus-visible:bg-muted-surface focus-visible:outline-none"
            >
              <MapPin aria-hidden size={18} className="shrink-0 text-brand" />
              <span>{feature.place_name}</span>
            </button>
          ))}
          {loadingSug || suggestionError || !suggestions.length ? (
            <p role="status" className="px-3 py-2 text-sm text-muted-ink">
              {suggestionError ? t("search.suggestionError") : loadingSug ? t("address.loading") : t("search.noSuggestion")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
