import { apiFetch } from "@/lib/api";

export const adminService = {
  // ---- Listings ----
  getListings: async () => {
    return await apiFetch(`/api/v1/admin/listings`, { method: "GET" });
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
  getBookings: async (status = "all") => {
    return await apiFetch(`/api/v1/admin/bookings?status=${status}`, {
      method: "GET",
    });
  },
  getBookingDetail: async (id) => {
    return await apiFetch(`/api/v1/admin/bookings/${id}`, {
      method: "GET",
    });
  },

  // ---- Users ----
  getUsers: async () => {
    return await apiFetch(`/api/v1/admin/users`, { method: "GET" });
  },
  updateUserRole: async (id, role) => {
    return await apiFetch(`/api/v1/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  // ---- Amenities ----
  getAmenities: async (activeFilter = "all") => {
    return await apiFetch(`/api/v1/admin/amenities?active=${activeFilter}`, {
      method: "GET",
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
  getReviews: async (vis = "all") => {
    return await apiFetch(`/api/v1/admin/reviews?visibility=${vis}`, {
      method: "GET",
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
  getPayments: async (status = "all", provider = "all") => {
    return await apiFetch(`/api/v1/admin/payments?status=${status}&provider=${provider}`, {
      method: "GET",
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
