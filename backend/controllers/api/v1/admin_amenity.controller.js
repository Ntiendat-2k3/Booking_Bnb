const { successResponse, errorResponse } = require("../../../utils/response");
const adminAmenityService = require("../../../services/admin_amenity.service");
const { invalidate } = require("../../../core/cache");

module.exports = {
  list: async (req, res) => {
    try {
      const { q = null, active = "all" } = req.query || {};
      const data = await adminAmenityService.list({ q, active });
      return successResponse(res, data, "Amenities fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  create: async (req, res) => {
    try {
      const data = await adminAmenityService.create(req.body || {});

      invalidate(["GET:/api/v1/amenities*", "GET:/api/v1/listings*"]).catch(() => {});
      return successResponse(res, data, "Amenity created", 201);
    } catch (e) {
      return errorResponse(res, e.message || "Create failed", e.status || 500);
    }
  },

  update: async (req, res) => {
    try {
      const data = await adminAmenityService.update(req.params.id, req.body || {});

      invalidate(["GET:/api/v1/amenities*", "GET:/api/v1/listings*"]).catch(() => {});
      return successResponse(res, data, "Amenity updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },

  setActive: async (req, res) => {
    try {
      const { is_active } = req.body || {};
      const data = await adminAmenityService.setActive(req.params.id, is_active === true);

      invalidate(["GET:/api/v1/amenities*", "GET:/api/v1/listings*"]).catch(() => {});
      return successResponse(res, data, "Amenity updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },
};
