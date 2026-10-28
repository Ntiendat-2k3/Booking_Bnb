import { intOrNull, numOrNull } from "./number.js";

/** Giữ số 0 từ API, tách dữ liệu chỉ đọc và dùng chuỗi rỗng cho các ô chưa nhập. */
export function listingFormValues(listing) {
  return {
    title: listing?.title || "",
    description: listing?.description || "",
    address: listing?.address || "",
    city: listing?.city || "",
    country: listing ? listing.country || "Vietnam" : "",
    property_type: listing?.property_type || "",
    room_type: listing?.room_type || "",
    price_per_night: listing?.price_per_night ?? "",
    cancellation_policy_code: listing?.cancellation_policy_code || "moderate",
    allow_pay_at_property: Boolean(listing?.allow_pay_at_property),
    max_guests: listing?.max_guests ?? "",
    bedrooms: listing?.bedrooms ?? "",
    beds: listing?.beds ?? "",
    bathrooms: listing?.bathrooms ?? "",
    lat: listing?.lat ?? "",
    lng: listing?.lng ?? "",
  };
}

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
