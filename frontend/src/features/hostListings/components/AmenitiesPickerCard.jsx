"use client";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

export default function AmenitiesPickerCard({ grouped, picked, onToggle, loading, error, onRetry, disabled }) {
  const t = useTranslations();
  return <section className="rounded-2xl border border-line bg-surface p-6" aria-busy={loading}>
    <h2 className="mb-3 text-sm font-semibold">{t("host.amenities")}</h2>
    {loading ? <p role="status">{t("common.loading")}</p> : error ? <div role="alert"><p>{t("common.loadFailed")}</p><Button variant="secondary" className="mt-3" onClick={onRetry}>{t("common.retry")}</Button></div> :
      <div className="max-h-[520px] space-y-4 overflow-auto">
        {grouped.map(([group, list]) => <fieldset key={group} disabled={disabled}>
          <legend className="text-xs font-semibold text-muted-ink">{group}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{list.map(amenity => <label key={amenity.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-muted-surface">
            <input type="checkbox" checked={picked.has(amenity.id)} onChange={() => onToggle(amenity.id)} className="accent-brand" />{amenity.name}
          </label>)}</div>
        </fieldset>)}
        {!grouped.length ? <p className="text-sm text-muted-ink">{t("host.noAmenities")}</p> : null}
      </div>}
  </section>;
}
