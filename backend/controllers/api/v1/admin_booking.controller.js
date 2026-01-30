const { successResponse, errorResponse } = require("../../../utils/response");
const adminBookingService = require("../../../services/admin_booking.service");

module.exports = {
  list: async (req, res) => {
    try {
      const { status = null, q = null, limit = 200 } = req.query || {};
      const data = await adminBookingService.list({ status, q, limit });
      return successResponse(res, data, "Bookings fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  detail: async (req, res) => {
    try {
      const data = await adminBookingService.detail(req.params.id);
      return successResponse(res, data, "OK", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Not found", e.status || 500);
    }
  },
};
