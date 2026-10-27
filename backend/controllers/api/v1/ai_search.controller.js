const service = require("../../../services/ai_search.service");
const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");

module.exports = {
  search: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await service.search({ ...req.body, ip: req.ip }));
  }),
  click: asyncHandler(async (req, res) => {
    await service.recordClick(req.params.id, req.body.listing_id);
    return res.status(204).end();
  }),
  booking: asyncHandler(async (req, res) => {
    await service.recordBooking(req.params.id, req.body.booking_id, req.user.user.id);
    return res.status(204).end();
  }),
  metrics: asyncHandler(async (_req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await service.metrics());
  }),
};
