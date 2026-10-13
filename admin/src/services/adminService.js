import { apiFetch } from "@/lib/api";

function listPath(path, params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "" && (key === "q" || value !== "all")) query.set(key, String(value));
  }
  return query.size ? `${path}?${query}` : path;
}

export const adminService = {
  // ---- Listings ----
  getListings: async ({ status = "all", q = "", page = 1, limit = 10, signal } = {}) => {
    return await apiFetch(listPath("/api/v1/admin/listings", { status, q: q.trim(), page, limit }), { method: "GET", signal });
  },
  approveListing: async (id) => {
    return await apiFetch(`/api/v1/admin/listings/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
  rejectListing: async (id, reason) => {
    return await apiFetch(`/api/v1/admin/listings/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
  bulkApproveListings: async (ids) => {
    return await apiFetch(`/api/v1/admin/listings/bulk-approve`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
  bulkRejectListings: async (ids, reason) => {
    return await apiFetch(`/api/v1/admin/listings/bulk-reject`, {
      method: "POST",
      body: JSON.stringify({ ids, reason }),
    });
  },

  // ---- Bookings ----
  getBookings: async ({ status = "all", q = "", page = 1, limit = 10, signal } = {}) => {
    return await apiFetch(listPath("/api/v1/admin/bookings", { status, q: q.trim(), page, limit }), {
      method: "GET", signal,
    });
  },
  getBookingDetail: async (id) => {
    return await apiFetch(`/api/v1/admin/bookings/${id}`, {
      method: "GET",
    });
  },

  // ---- Users ----
  getUsers: async ({ q = "", page = 1, limit = 10, signal } = {}) => {
    return await apiFetch(listPath("/api/v1/admin/users", { q: q.trim(), page, limit }), { method: "GET", signal });
  },
  updateUserRole: async (id, role) => {
    return await apiFetch(`/api/v1/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  // ---- Amenities ----
  getAmenities: async ({ active = "all", group = "all", q = "", page = 1, limit = 10, signal } = {}) => {
    return await apiFetch(listPath("/api/v1/admin/amenities", { active, group, q: q.trim(), page, limit }), {
      method: "GET", signal,
    });
  },
  createAmenity: async (data) => {
    return await apiFetch("/api/v1/admin/amenities", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateAmenity: async (id, data) => {
    return await apiFetch(`/api/v1/admin/amenities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  toggleAmenityActive: async (id, is_active) => {
    return await apiFetch(`/api/v1/admin/amenities/${id}/active`, {
      method: "POST",
      body: JSON.stringify({ is_active }),
    });
  },

  // ---- Reviews ----
  getReviews: async ({ visibility = "all", rating = "all", q = "", page = 1, limit = 10, signal } = {}) => {
    return await apiFetch(listPath("/api/v1/admin/reviews", { visibility, rating, q: q.trim(), page, limit }), {
      method: "GET", signal,
    });
  },
  hideReview: async (id) => {
    return await apiFetch(`/api/v1/admin/reviews/${id}/hide`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
  unhideReview: async (id) => {
    return await apiFetch(`/api/v1/admin/reviews/${id}/unhide`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
  deleteReview: async (id) => {
    return await apiFetch(`/api/v1/admin/reviews/${id}`, { method: "DELETE" });
  },
  bulkHideReviews: async (ids) => {
    return await apiFetch(`/api/v1/admin/reviews/bulk-hide`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
  bulkUnhideReviews: async (ids) => {
    return await apiFetch(`/api/v1/admin/reviews/bulk-unhide`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },
  bulkDeleteReviews: async (ids) => {
    return await apiFetch(`/api/v1/admin/reviews/bulk-delete`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  // ---- Payments ----
  getPayments: async ({ status = "all", provider = "all", q = "", page = 1, limit = 10, signal } = {}) => {
    return await apiFetch(listPath("/api/v1/admin/payments", { status, provider, q: q.trim(), page, limit }), {
      method: "GET", signal,
    });
  },
  getPaymentDetail: async (id) => {
    return await apiFetch(`/api/v1/admin/payments/${id}`, {
      method: "GET",
    });
  },

  // ---- Dashboard ----
  getDashboardStats: async () => {
    return await apiFetch(`/api/v1/admin/dashboard/stats`, { method: "GET" });
  },
};
