"use client";
import dynamic from "next/dynamic";
import InputField from "@/components/atoms/InputField";
import { useTranslations } from "@/i18n/LocaleProvider";
const MapboxAddressPicker = dynamic(() => import("@/components/MapboxAddressPicker"), { ssr: false });

export default function ListingFieldsCard({ form, setField, setForm, disabled = false }) {
  const t = useTranslations();
  const applyPatch = (patch) => {
    if (typeof setForm === "function") { setForm((previous) => ({ ...previous, ...patch })); return; }
    Object.entries(patch || {}).forEach(([key, value]) => setField(key, value));
  };
  return <fieldset disabled={disabled} className="surface-panel min-w-0 space-y-5 p-5 sm:p-8">
    <InputField label={t("host.listingTitle")} value={form.title} onChange={(e) => setField("title", e.target.value)} />
    <div><label htmlFor="listing-description" className="mb-2 block text-sm font-semibold">{t("host.description")}</label><textarea id="listing-description" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={5} className="field-control" /></div>
    <MapboxAddressPicker address={form.address} city={form.city} country={form.country} lat={form.lat} lng={form.lng} onChange={applyPatch} />
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label={t("host.price")} type="number" value={form.price_per_night} onChange={(e) => setField("price_per_night", e.target.value)} />
      <InputField label={t("host.maxGuests")} type="number" value={form.max_guests} onChange={(e) => setField("max_guests", e.target.value)} />
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      <InputField label={t("host.bedrooms")} type="number" value={form.bedrooms} onChange={(e) => setField("bedrooms", e.target.value)} />
      <InputField label={t("host.beds")} type="number" value={form.beds} onChange={(e) => setField("beds", e.target.value)} />
      <InputField label={t("host.bathrooms")} type="number" step="any" value={form.bathrooms} onChange={(e) => setField("bathrooms", e.target.value)} />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label={t("host.propertyType")} value={form.property_type} onChange={(e) => setField("property_type", e.target.value)} />
      <InputField label={t("host.roomType")} value={form.room_type} onChange={(e) => setField("room_type", e.target.value)} />
    </div>
  </fieldset>;
}
