const propertyPayments = require("../../../services/property_payment.service");
const { transformBooking } = require("../../../transformers/booking.transformer");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");

module.exports = {
  confirm: asyncHandler(async (req, res) => successResponse(res, {
    booking: transformBooking((await propertyPayments.confirm({
      bookingId: req.params.id, userId: req.user.user.id,
    })).booking),
  }, "Booking confirmed")),
  collect: asyncHandler(async (req, res) => successResponse(res,
    await propertyPayments.collect({ user: req.user.user, listingId: req.body.listing_id,
      bookingId: req.params.id, method: req.body.method, amount: req.body.amount }),
    "Payment recorded")),
  report: asyncHandler(async (req, res) => successResponse(res,
    await propertyPayments.report({ user: req.user.user, listingId: req.query.listing_id,
      page: req.query.page }))),
  reconcile: asyncHandler(async (req, res) => successResponse(res,
    await propertyPayments.reconcile({ user: req.user.user, collectionId: req.params.id }),
    "Collection reconciled")),
  noShow: asyncHandler(async (req, res) => successResponse(res,
    await propertyPayments.noShow({ user: req.user.user, listingId: req.body.listing_id,
      bookingId: req.params.id, reason: req.body.reason }), "No-show recorded")),
};
