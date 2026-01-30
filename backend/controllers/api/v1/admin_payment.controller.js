const { successResponse, errorResponse } = require("../../../utils/response");
const adminPaymentService = require("../../../services/admin_payment.service");

module.exports = {
  list: async (req, res) => {
    try {
      const { status = null, provider = null, q = null, limit = 200 } = req.query || {};
      const data = await adminPaymentService.list({ status, provider, q, limit });
      return successResponse(res, data, "Payments fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  detail: async (req, res) => {
    try {
      const data = await adminPaymentService.detail(req.params.id);
      return successResponse(res, data, "OK", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Not found", e.status || 500);
    }
  },
};
