import { apiFetch } from "@/lib/api";

export const HostListingsApi = {
  getOne: (id) => apiFetch(`/api/v1/host/listings/${id}`, { method: "GET" }),

  create: (payload) =>
    apiFetch("/api/v1/host/listings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  patch: (id, payload) =>
    apiFetch(`/api/v1/host/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  setAmenities: (id, amenityIds) =>
    apiFetch(`/api/v1/host/listings/${id}/amenities`, {
      method: "PUT",
      body: JSON.stringify({ amenity_ids: amenityIds }),
    }),

  submit: (id) => apiFetch(`/api/v1/host/listings/${id}/submit`, { method: "POST" }),
  pause: (id) => apiFetch(`/api/v1/host/listings/${id}/pause`, { method: "POST" }),
  resume: (id) => apiFetch(`/api/v1/host/listings/${id}/resume`, { method: "POST" }),

  remove: (id) => apiFetch(`/api/v1/host/listings/${id}`, { method: "DELETE" }),
};
