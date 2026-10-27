const calendar = require("../../../services/calendar.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");

module.exports = {
  host: asyncHandler(async (req, res) => successResponse(res,
    await calendar.forHost(req.user.user, req.query))),
  publicAvailability: asyncHandler(async (req, res) => successResponse(res,
    await calendar.publicAvailability(req.params.id, req.query))),
  setPublicVisibility: asyncHandler(async (req, res) => successResponse(res,
    await calendar.setPublicVisibility(req.user.user, req.body))),
  block: asyncHandler(async (req, res) => successResponse(res,
    await calendar.block(req.user.user, req.body), "Đã khóa lịch", 201)),
  unblock: asyncHandler(async (req, res) => successResponse(res,
    await calendar.unblock(req.user.user, req.body), "Đã mở lịch")),
};
