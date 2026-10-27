import { apiFetch } from "@/lib/api";

export async function getListingQuote(listingId, checkIn, checkOut, signal) {
  const response = await apiFetch(`/api/v1/listings/${listingId}/quote`, {
    params: { check_in: checkIn, check_out: checkOut }, signal,
  });
  return response?.data;
}

export async function createBooking(payload) {
  const res = await apiFetch("/api/v1/bookings", {
    method: "POST",
    body: payload,
  });
  const booking = res?.data?.booking;
  try {
    const saved = JSON.parse(sessionStorage.getItem("booking-bnb-ai-search") || "null");
    if (booking?.id && saved?.listing_id === (payload.listing_id || payload.listingId) &&
      Date.now() - saved.saved_at < 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem("booking-bnb-ai-search");
      void apiFetch(`/api/v1/ai-search/${saved.search_id}/booking`, {
        method: "POST", body: { booking_id: booking.id },
      }).catch(() => {});
    }
  } catch { /* Thống kê không được cản trở việc đặt phòng. */ }
  return booking;
}

export async function createStripePayment(bookingId) {
  const res = await apiFetch(`/api/v1/bookings/${bookingId}/payments/stripe`, {
    method: "POST",
    body: {},
  });
  return res?.data;
}

export async function confirmPropertyPayment(bookingId) {
  const res = await apiFetch(`/api/v1/bookings/${bookingId}/payments/property`, {
    method: "POST", body: {},
  });
  return res?.data?.booking;
}

export async function reconcileStripePayment(bookingId) {
  const res = await apiFetch("/api/v1/bookings/" + bookingId + "/payments/stripe/reconcile", {
    method: "POST",
    body: {},
  });
  return res?.data;
}

export async function updateBooking(bookingId, payload) {
  const res = await apiFetch(`/api/v1/bookings/${bookingId}`, {
    method: "PATCH",
    body: payload,
  });
  return res?.data?.booking;
}

export async function applyBookingCoupon(bookingId, code) {
  const response = await apiFetch(`/api/v1/bookings/${bookingId}/coupon`, {
    method: "POST", body: { code },
  });
  return response?.data?.booking;
}

export async function removeBookingCoupon(bookingId) {
  const response = await apiFetch(`/api/v1/bookings/${bookingId}/coupon`, { method: "DELETE" });
  return response?.data?.booking;
}

export async function getMyBookings() {
  const res = await apiFetch("/api/v1/bookings/me", { method: "GET" });
  return res?.data?.items || [];
}

export async function getListingCalendar(listingId, startDate, endDate) {
  const res = await apiFetch(`/api/v1/listings/${listingId}/availability`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return res?.data;
}

export async function getListingAvailability(listingId, startDate, endDate) {
  const calendar = await getListingCalendar(listingId, startDate, endDate);
  return calendar?.intervals || [];
}
