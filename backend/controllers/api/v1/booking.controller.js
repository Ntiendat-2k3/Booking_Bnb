const bookingService = require("../../../services/booking.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");
module.exports = {
  create: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const {
      listing_id,
      listingId,
      check_in,
      check_out,
      guests_count
    } = req.body || {};
    const finalListingId = listing_id || listingId;
    const {
      booking
    } = await bookingService.create({
      userId,
      listingId: finalListingId,
      check_in,
      check_out,
      guests_count
    });
    return successResponse(res, {
      booking
    }, "Booking created", 201);
  }),
  myBookings: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const data = await bookingService.myBookings({
      userId,
      ...req.query
    });
    return successResponse(res, data, "Success");
  }),
  detail: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const bookingId = req.params.id;
    const booking = await bookingService.detail({
      userId,
      bookingId
    });
    return successResponse(res, {
      booking
    }, "Success");
  }),
  cancel: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const bookingId = req.params.id;
    const booking = await bookingService.cancel({
      userId,
      bookingId
    });
    return successResponse(res, {
      booking
    }, "Booking cancelled");
  }),
  checkout: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const bookingId = req.params.id;
    const booking = await bookingService.checkout({
      userId,
      bookingId
    });
    return successResponse(res, {
      booking
    }, "Checkout success");
  }),
  update: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const bookingId = req.params.id;
    const {
      check_in,
      check_out,
      guests_count
    } = req.body || {};
    const booking = await bookingService.update({
      userId,
      bookingId,
      check_in,
      check_out,
      guests_count
    });
    return successResponse(res, {
      booking
    }, "Booking updated");
  })
};
