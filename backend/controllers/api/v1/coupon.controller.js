const coupons = require("../../../services/coupon.service");
const bookingService = require("../../../services/booking.service");
const { transformBooking } = require("../../../transformers/booking.transformer");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");

module.exports = {
  apply: asyncHandler(async (req, res) => {
    await coupons.apply({ bookingId: req.params.id, userId: req.user.user.id, code: req.body.code });
    res.set("Cache-Control", "no-store");
    return successResponse(res, { booking: transformBooking(await bookingService.detail({
      bookingId: req.params.id, userId: req.user.user.id })) });
  }),
  remove: asyncHandler(async (req, res) => {
    await coupons.apply({ bookingId: req.params.id, userId: req.user.user.id, code: "" });
    res.set("Cache-Control", "no-store");
    return successResponse(res, { booking: transformBooking(await bookingService.detail({
      bookingId: req.params.id, userId: req.user.user.id })) });
  }),
  create: asyncHandler(async (req, res) => successResponse(res,
    await coupons.create(req.body, req.user.user), "Coupon created", 201)),
  report: asyncHandler(async (_req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await coupons.report());
  }),
  active: asyncHandler(async (req, res) => successResponse(res,
    await coupons.setActive(req.params.id, req.body.is_active))),
};
