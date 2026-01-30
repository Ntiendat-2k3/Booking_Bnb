const { successResponse, errorResponse } = require("../../../utils/response");
const adminListingService = require("../../../services/admin_listing.service");
const { invalidate } = require("../../../core/cache");

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

      invalidate(["GET:/api/v1/listings*", `GET:/api/v1/listings/${req.params.id}*`]).catch(() => {});
      return successResponse(res, data, "Approved", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Approve failed", e.status || 500);
    }
  },

  reject: async (req, res) => {
    try {
      const reason = req.body?.reason || null;
      const data = await adminListingService.reject(req.params.id, reason);

      invalidate(["GET:/api/v1/listings*", `GET:/api/v1/listings/${req.params.id}*`]).catch(() => {});
      return successResponse(res, data, "Rejected", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Reject failed", e.status || 500);
    }
  },
};
