import { intOrNull, numOrNull } from "./number";

/** Chuẩn hóa số trước khi gửi, giữ nguyên tên trường mà backend đang nhận. */
export function buildListingPayload(form) {
  return {
    ...form,
    price_per_night: intOrNull(form.price_per_night),
    max_guests: intOrNull(form.max_guests),
    bedrooms: intOrNull(form.bedrooms) ?? 0,
    beds: intOrNull(form.beds) ?? 0,
    bathrooms: numOrNull(form.bathrooms) ?? 0,
    lat: numOrNull(form.lat),
    lng: numOrNull(form.lng),
  };
}
