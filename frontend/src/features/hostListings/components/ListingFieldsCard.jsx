"use client";

import dynamic from "next/dynamic";
import { Bed, HouseLine, MapPin } from "@phosphor-icons/react";
import InputField from "@/components/atoms/InputField";
import { useTranslations } from "@/i18n/LocaleProvider";

const MapboxAddressPicker = dynamic(() => import("@/components/MapboxAddressPicker"), { ssr: false });

export default function ListingFieldsCard({ form, setField, setForm, disabled = false }) {
  const t = useTranslations();
  const applyPatch = (patch) => {
    if (typeof setForm === "function") {
      setForm((previous) => ({ ...previous, ...patch }));
      return;
    }
    Object.entries(patch || {}).forEach(([key, value]) => setField(key, value));
  };

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <section className="surface-panel space-y-5 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-control bg-brand/10 p-2.5 text-brand"><HouseLine aria-hidden size={23} /></span>
          <div>
            <h2 className="text-base font-semibold">{t("host.basicInfo")}</h2>
            <p className="mt-0.5 text-sm text-muted-ink">{t("host.basicInfoHint")}</p>
          </div>
        </div>
        <div className="border-t border-line pt-5">
          <InputField label={t("host.listingTitle")} maxLength={255} value={form.title} onChange={(e) => setField("title", e.target.value)} />
          <p className="mt-1 text-right text-xs text-muted-ink">{form.title.length}/255</p>
        </div>
        <div>
          <label htmlFor="listing-description" className="mb-2 block text-sm font-semibold">{t("host.description")}</label>
          <textarea id="listing-description" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={4} maxLength={10000} className="field-control" />
        </div>
      </section>

      <section className="surface-panel space-y-5 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-control bg-brand/10 p-2.5 text-brand"><MapPin aria-hidden size={23} /></span>
          <div>
            <h2 className="text-base font-semibold">{t("host.locationInfo")}</h2>
            <p className="mt-0.5 text-sm text-muted-ink">{t("host.locationInfoHint")}</p>
          </div>
        </div>
        <div className="border-t border-line pt-5">
          <MapboxAddressPicker address={form.address} city={form.city} country={form.country} lat={form.lat} lng={form.lng} onChange={applyPatch} />
        </div>
      </section>

      <section className="surface-panel space-y-5 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-control bg-brand/10 p-2.5 text-brand"><Bed aria-hidden size={23} /></span>
          <div>
            <h2 className="text-base font-semibold">{t("host.roomDetails")}</h2>
            <p className="mt-0.5 text-sm text-muted-ink">{t("host.roomDetailsHint")}</p>
          </div>
        </div>
        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <InputField label={t("host.price")} type="number" min="1" value={form.price_per_night} onChange={(e) => setField("price_per_night", e.target.value)} />
          <InputField label={t("host.maxGuests")} type="number" min="1" value={form.max_guests} onChange={(e) => setField("max_guests", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <InputField label={t("host.bedrooms")} type="number" min="0" value={form.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} />
          <InputField label={t("host.beds")} type="number" min="0" value={form.beds} onChange={(e) => setField("beds", e.target.value)} />
          <InputField label={t("host.bathrooms")} type="number" min="0" step="0.1" value={form.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label={t("host.propertyType")} value={form.property_type} onChange={(e) => setField("property_type", e.target.value)} />
          <InputField label={t("host.roomType")} value={form.room_type} onChange={(e) => setField("room_type", e.target.value)} />
        </div>
      </section>
    </fieldset>
  );
}
