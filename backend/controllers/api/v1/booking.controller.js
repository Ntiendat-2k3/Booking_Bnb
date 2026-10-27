const bookingService = require("../../../services/booking.service");
const cancellationService = require("../../../services/cancellation.service");
const { transformBooking } = require("../../../transformers/booking.transformer");
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
      guests_count,
      expected_total
    } = req.body || {};
    const finalListingId = listing_id || listingId;
    const {
      booking
    } = await bookingService.create({
      userId,
      listingId: finalListingId,
      check_in,
      check_out,
      guests_count,
      expectedTotal: expected_total,
    });
    return successResponse(res, {
      booking: transformBooking(booking)
    }, "Booking created", 201);
  }),
  myBookings: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const data = await bookingService.myBookings({
      userId,
      ...req.query
    });
    return successResponse(res, { ...data, items: data.items.map(transformBooking) }, "Success");
  }),
  detail: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const bookingId = req.params.id;
    const booking = await bookingService.detail({
      userId,
      bookingId
    });
    return successResponse(res, {
      booking: transformBooking(booking)
    }, "Success");
  }),
  cancel: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const bookingId = req.params.id;
    const { booking, cancellation } = await bookingService.cancel({
      userId,
      bookingId,
      expectedRefundAmount: req.body?.expected_refund_amount,
      reason: req.body?.reason,
    });
    return successResponse(res, {
      booking: transformBooking(booking), cancellation,
    }, "Booking cancelled");
  }),
  cancellationQuote: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await cancellationService.preview({
      userId: req.user.user.id, bookingId: req.params.id,
    }));
  }),
  cancellationHistory: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, { cancellation: await cancellationService.history({
      userId: req.user.user.id, bookingId: req.params.id,
    }) });
  }),
  checkout: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const bookingId = req.params.id;
    const booking = await bookingService.checkout({
      userId,
      bookingId
    });
    return successResponse(res, {
      booking: transformBooking(booking)
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
      booking: transformBooking(booking)
    }, "Booking updated");
  })
};
