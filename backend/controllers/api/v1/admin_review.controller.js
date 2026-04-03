const { successResponse, errorResponse } = require("../../../utils/response");
const adminReviewService = require("../../../services/admin_review.service");
const { invalidateReviews, invalidateListings } = require("../../../core/cache");

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
      invalidateReviews(listingId);
      return successResponse(res, data, "Hidden", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },

  unhide: async (req, res) => {
    try {
      const data = await adminReviewService.setHidden(req.params.id, false);
      const listingId = data?.review?.listing_id;
      invalidateReviews(listingId);
      return successResponse(res, data, "Visible", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },

  remove: async (req, res) => {
    try {
      const data = await adminReviewService.remove(req.params.id);
      const listingId = data?.listing_id;
      invalidateReviews(listingId);
      return successResponse(res, data, "Deleted", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Delete failed", e.status || 500);
    }
  },

  bulkHide: async (req, res) => {
    try {
      const ids = req.body?.ids || [];
      const data = await adminReviewService.bulkSetHidden(ids, true);
      invalidateListings();
      return successResponse(res, data, "Bulk hide processed", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Bulk action failed", e.status || 500);
    }
  },

  bulkUnhide: async (req, res) => {
    try {
      const ids = req.body?.ids || [];
      const data = await adminReviewService.bulkSetHidden(ids, false);
      invalidateListings();
      return successResponse(res, data, "Bulk unhide processed", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Bulk action failed", e.status || 500);
    }
  },

  bulkRemove: async (req, res) => {
    try {
      const ids = req.body?.ids || [];
      const data = await adminReviewService.bulkRemove(ids);
      invalidateListings();
      return successResponse(res, data, "Bulk remove processed", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Bulk action failed", e.status || 500);
    }
  },
};
