const stay = require("../../../services/booking_stay.service");
const bookingQr = require("../../../services/booking_qr.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");

module.exports = {
  verificationQr: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await bookingQr.getForGuest({ guestId: req.user.user.id,
      bookingId: req.params.id }));
  }),
  rotateVerificationQr: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await bookingQr.rotate({ guestId: req.user.user.id,
      bookingId: req.params.id }));
  }),
  resendConfirmation: asyncHandler(async (req, res) => successResponse(res,
    await bookingQr.resend({ guestId: req.user.user.id, bookingId: req.params.id }),
    "Confirmation email queued")),
  issueQr: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await stay.issueQr({ guestId: req.user.user.id,
      bookingId: req.params.id, purpose: req.body.purpose }));
  }),
  hostList: asyncHandler(async (req, res) => successResponse(res,
    await stay.listForHost({ user: req.user.user, listingId: req.query.listing_id,
      code: req.query.code, page: req.query.page }))),
  inspect: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await stay.inspectQr({ user: req.user.user,
      rawToken: req.body.token }));
  }),
  confirm: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await stay.confirmQr({ user: req.user.user,
      rawToken: req.body.token }), "Đã cập nhật lưu trú");
  }),
  manual: asyncHandler(async (req, res) => successResponse(res,
    await stay.manual({ user: req.user.user, listingId: req.body.listing_id,
      bookingId: req.params.id, purpose: req.body.purpose, reason: req.body.reason }), "Đã cập nhật lưu trú")),
  events: asyncHandler(async (req, res) => successResponse(res, { items:
    await stay.eventsForHost({ user: req.user.user, listingId: req.query.listing_id,
      bookingId: req.params.id }) })),
};
