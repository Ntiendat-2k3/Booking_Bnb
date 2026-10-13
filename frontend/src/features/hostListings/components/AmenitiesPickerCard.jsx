"use client";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import AmenityIcon from "@/components/AmenityIcon";
import { Sparkle } from "@phosphor-icons/react";

export default function AmenitiesPickerCard({ grouped, picked, onToggle, loading, error, onRetry, disabled }) {
  const t = useTranslations();
  return <section className="surface-panel p-4 sm:p-6" aria-busy={loading}>
    <div className="mb-5 flex items-start gap-3">
      <span className="rounded-control bg-brand/10 p-2.5 text-brand"><Sparkle aria-hidden size={23} /></span>
      <div><h2 className="text-base font-semibold">{t("host.amenities")}</h2><p className="mt-0.5 text-sm text-muted-ink">{t("host.amenitiesHint")}</p></div>
    </div>
    {loading ? <p role="status">{t("common.loading")}</p> : error ? <div role="alert"><p>{t("common.loadFailed")}</p><Button variant="secondary" className="mt-3" onClick={onRetry}>{t("common.retry")}</Button></div> :
      <div className="max-h-[420px] space-y-4 overflow-auto border-t border-line pt-4 pr-1">
        {grouped.map(([group, list]) => <fieldset key={group} disabled={disabled}>
          <legend className="text-xs font-semibold text-muted-ink">{group}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{list.map(amenity => <label key={amenity.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line px-3 py-2 text-sm transition hover:bg-muted-surface has-[:checked]:border-brand/40 has-[:checked]:bg-brand/5">
            <input type="checkbox" checked={picked.has(amenity.id)} onChange={() => onToggle(amenity.id)} className="accent-brand" />
            <AmenityIcon amenity={amenity} className="shrink-0 text-brand" />
            <span>{amenity.name}</span>
          </label>)}</div>
        </fieldset>)}
        {!grouped.length ? <p className="text-sm text-muted-ink">{t("host.noAmenities")}</p> : null}
      </div>}
  </section>;
}
