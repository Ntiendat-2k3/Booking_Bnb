import { apiFetch } from "@/lib/api";

export async function createBooking(payload) {
  const res = await apiFetch("/api/v1/bookings", {
    method: "POST",
    body: payload,
  });
  return res?.data?.booking;
}

export async function createStripePayment(bookingId) {
  const res = await apiFetch(`/api/v1/bookings/${bookingId}/payments/stripe`, {
    method: "POST",
    body: {},
  });
  return res?.data?.payment_url;
}
