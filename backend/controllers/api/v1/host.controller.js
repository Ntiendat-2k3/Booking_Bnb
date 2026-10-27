const hostService = require("../../../services/host.service");
const analytics = require("../../../services/analytics.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");
module.exports = {
  apply: asyncHandler(async (req, res) => successResponse(res, await hostService.apply(req.user.user), "Tài khoản chủ nhà đã sẵn sàng")),
  getDashboardStats: asyncHandler(async (req, res) => successResponse(res, await hostService.getDashboardStats(req.user.user.id))),
  analytics: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await analytics.report({ ...req.query, hostId: req.user.user.id }));
  }),
  analyticsCsv: asyncHandler(async (req, res) => {
    const data = await analytics.report({ ...req.query, hostId: req.user.user.id });
    res.set("Cache-Control", "no-store");
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="host-analytics-${data.start}-${data.end}.csv"`);
    return res.send(analytics.toCsv(data));
  }),
  contactHost: asyncHandler(async (req, res) => {
    await hostService.contactHost(req.params.id, req.body);
    return successResponse(res, null, "Yêu cầu liên hệ đã được tiếp nhận");
  })
};
