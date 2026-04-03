const { successResponse, errorResponse } = require("../../../utils/response");
const adminListingService = require("../../../services/admin_listing.service");
const { invalidateListings } = require("../../../core/cache");

module.exports = {
  list: async (req, res) => {
    try {
      const status = req.query.status || null;
      const data = await adminListingService.list({ status });
      return successResponse(res, data, "Admin listings fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  approve: async (req, res) => {
    try {
      const data = await adminListingService.approve(req.params.id);
      invalidateListings(req.params.id);
      return successResponse(res, data, "Approved", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Approve failed", e.status || 500);
    }
  },

  reject: async (req, res) => {
    try {
      const reason = req.body?.reason || null;
      const data = await adminListingService.reject(req.params.id, reason);
      invalidateListings(req.params.id);
      return successResponse(res, data, "Rejected", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Reject failed", e.status || 500);
    }
  },

  bulkApprove: async (req, res) => {
    try {
      const ids = req.body?.ids || [];
      const data = await adminListingService.bulkApprove(ids);
      invalidateListings();
      return successResponse(res, data, "Bulk approve processed", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Bulk approve failed", e.status || 500);
    }
  },

  bulkReject: async (req, res) => {
    try {
      const ids = req.body?.ids || [];
      const reason = req.body?.reason || null;
      const data = await adminListingService.bulkReject(ids, reason);
      invalidateListings();
      return successResponse(res, data, "Bulk reject processed", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Bulk reject failed", e.status || 500);
    }
  },
};
