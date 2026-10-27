const pricing = require("../../../services/pricing.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");

module.exports = {
  quote: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await pricing.publicQuote(req.params.id, req.query));
  }),
  weekdays: asyncHandler(async (req, res) => successResponse(res,
    await pricing.setWeekdays(req.user.user, req.body))),
  day: asyncHandler(async (req, res) => successResponse(res,
    await pricing.setDay(req.user.user, req.body))),
  addRange: asyncHandler(async (req, res) => successResponse(res,
    await pricing.addRange(req.user.user, req.body), "Pricing rule created", 201)),
  removeRange: asyncHandler(async (req, res) => successResponse(res,
    await pricing.removeRange(req.user.user, { listing_id: req.query.listing_id, id: req.params.id }))),
};
