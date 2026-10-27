const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");
const adminDashboardService = require("../../../services/admin_dashboard.service");
const analytics = require("../../../services/analytics.service");
module.exports = {
  getStats: asyncHandler(async (req, res) => {
    const stats = await adminDashboardService.getGlobalStats();
    return successResponse(res, stats, "Dashboard stats fetched", 200);
  }),
  analytics: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, await analytics.report({ ...req.query, admin: true }));
  }),
};
