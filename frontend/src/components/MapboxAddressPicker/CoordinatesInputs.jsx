"use client";
import { asNum, pickFromContext, geocodeReverse } from "@/hooks/useMapboxLocation";
import { useLocale } from "@/i18n/LocaleProvider";
import InputField from "@/components/atoms/InputField";

export default function CoordinatesInputs({ city, country, lat, lng, onChange, token }) {
  const { locale, t } = useLocale();
  async function onLatLngBlur() {
    if (!token) return;
    const latitude = asNum(lat); const longitude = asNum(lng);
    if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    try {
      const result = await geocodeReverse(longitude, latitude, token, undefined, locale === "en" ? "en" : "vi");
      const feature = result?.features?.[0];
      if (feature?.place_name) onChange?.({ address: feature.place_name, city: pickFromContext(feature, "place") || city, country: pickFromContext(feature, "country") || country });
    } catch { /* Giữ thông tin người dùng nhập nếu không lấy được địa chỉ. */ }
  }
  return <>
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label={t("search.city")} value={city || ""} onChange={(e) => onChange?.({ city: e.target.value })} placeholder={t("address.cityHint")} />
      <InputField label={t("address.country")} value={country || ""} onChange={(e) => onChange?.({ country: e.target.value })} placeholder={t("address.countryHint")} />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <InputField label={t("address.lat")} type="number" step="any" min="-90" max="90" value={lat ?? ""} onChange={(e) => onChange?.({ lat: e.target.value })} onBlur={onLatLngBlur} placeholder={t("address.latHint")} />
      <InputField label={t("address.lng")} type="number" step="any" min="-180" max="180" value={lng ?? ""} onChange={(e) => onChange?.({ lng: e.target.value })} onBlur={onLatLngBlur} placeholder={t("address.lngHint")} />
    </div>
  </>;
}
