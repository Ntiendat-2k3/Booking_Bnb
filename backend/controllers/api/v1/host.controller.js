const hostService = require("../../../services/host.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");
module.exports = {
  apply: asyncHandler(async (req, res) => successResponse(res, await hostService.apply(req.user.user), "Tài khoản chủ nhà đã sẵn sàng")),
  getDashboardStats: asyncHandler(async (req, res) => successResponse(res, await hostService.getDashboardStats(req.user.user.id))),
  contactHost: asyncHandler(async (req, res) => {
    await hostService.contactHost(req.params.id, req.body);
    return successResponse(res, null, "Yêu cầu liên hệ đã được tiếp nhận");
  })
};
