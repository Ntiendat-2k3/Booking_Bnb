"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


import { useMapboxAutocomplete } from "@/hooks/useMapboxLocation";

export default function AddressAutocomplete({ label, address, onChange, token }) {
  const t = useTranslations();
  const {
    query,
    setQuery,
    suggestions,
    openSug,
    setOpenSug,
    loadingSug,
    suggestionError,
    wrapperRef,
    suppressRef,
    selectFeature
  } = useMapboxAutocomplete({
    token,
    initialQuery: address,
    onSelect: onChange
  });

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor="field-MapboxAddressPicker-AddressAutocomplete-25" className="text-sm font-semibold">{label || t("address.label")}</label>
      <input id="field-MapboxAddressPicker-AddressAutocomplete-25"
        value={query}
        onKeyDown={event => { if (event.key === "Escape") setOpenSug(false); if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); wrapperRef.current?.querySelector("button")?.focus(); } }}
        onChange={(e) => {
          const v = e.target.value;
          suppressRef.current = false;
          setOpenSug(true);
          setQuery(v);
          onChange?.({ address: v });
        }}
        className="mt-2 w-full rounded-xl border px-3 py-2"
        placeholder={t("address.placeholder")}
      />

      {token ? (
        <div className="mt-1 text-xs text-muted-ink">
          {suggestionError ? t("address.suggestionError") : loadingSug ? t("address.loading") : t("address.hint")}
        </div>
      ) : (
        <div className="mt-1 text-xs text-rose-600">{t("address.unavailable")}</div>
      )}

      {openSug && suggestions.length ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border bg-surface shadow">
          {suggestions.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFeature(f)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted-surface"
            >
              {f.place_name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
