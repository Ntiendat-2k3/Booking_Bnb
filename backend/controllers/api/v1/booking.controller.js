const bookingService = require("../../../services/booking.service");
const { successResponse, errorResponse } = require("../../../utils/response");

module.exports = {
  async create(req, res) {
    try {
      const userId = req.user.user.id;
      const { listing_id, check_in, check_out, guests_count } = req.body || {};
      const { booking } = await bookingService.create({
        userId,
        listingId: listing_id,
        check_in,
        check_out,
        guests_count,
      });
      return successResponse(res, { booking }, "Booking created", 201);
    } catch (e) {
      return errorResponse(res, e.message || "Create booking failed", e.status || 500);
    }
  },

  async myBookings(req, res) {
    try {
      const userId = req.user.user.id;
      const items = await bookingService.myBookings({ userId });
      return successResponse(res, { items }, "Success");
    } catch (e) {
      return errorResponse(res, e.message || "Fetch bookings failed", e.status || 500);
    }
  },

  async cancel(req, res) {
    try {
      const userId = req.user.user.id;
      const bookingId = req.params.id;
      const booking = await bookingService.cancel({ userId, bookingId });
      return successResponse(res, { booking }, "Booking cancelled");
    } catch (e) {
      return errorResponse(res, e.message || "Cancel booking failed", e.status || 500);
    }
  },
};
