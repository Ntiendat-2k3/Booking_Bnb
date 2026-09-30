const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");
const adminBookingService = require("../../../services/admin_booking.service");
module.exports = {
  list: asyncHandler(async (req, res) => {
    const {
      status = null,
      q = null,
      limit = 200,
      page = 1
    } = req.query || {};
    const data = await adminBookingService.list({
      status,
      q,
      limit,
      page
    });
    return successResponse(res, data, "Bookings fetched", 200);
  }),
  detail: asyncHandler(async (req, res) => {
    const data = await adminBookingService.detail(req.params.id);
    return successResponse(res, data, "OK", 200);
  })
};
