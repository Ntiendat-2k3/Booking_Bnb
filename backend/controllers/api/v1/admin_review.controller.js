const { successResponse, errorResponse } = require("../../../utils/response");
const adminReviewService = require("../../../services/admin_review.service");
const { invalidate } = require("../../../core/cache");

module.exports = {
  list: async (req, res) => {
    try {
      const { visibility = "all", q = null, limit = 200 } = req.query || {};
      const data = await adminReviewService.list({ visibility, q, limit });
      return successResponse(res, data, "Reviews fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  hide: async (req, res) => {
    try {
      const data = await adminReviewService.setHidden(req.params.id, true);

      const listingId = data?.review?.listing_id;
      invalidate(["GET:/api/v1/listings*", listingId ? `GET:/api/v1/listings/${listingId}*` : null].filter(Boolean)).catch(() => {});
      return successResponse(res, data, "Hidden", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },

  unhide: async (req, res) => {
    try {
      const data = await adminReviewService.setHidden(req.params.id, false);

      const listingId = data?.review?.listing_id;
      invalidate(["GET:/api/v1/listings*", listingId ? `GET:/api/v1/listings/${listingId}*` : null].filter(Boolean)).catch(() => {});
      return successResponse(res, data, "Visible", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },

  remove: async (req, res) => {
    try {
      const data = await adminReviewService.remove(req.params.id);

      const listingId = data?.listing_id;
      invalidate(["GET:/api/v1/listings*", listingId ? `GET:/api/v1/listings/${listingId}*` : null].filter(Boolean)).catch(() => {});
      return successResponse(res, data, "Deleted", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Delete failed", e.status || 500);
    }
  },
};
