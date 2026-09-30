const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");
const adminDashboardService = require("../../../services/admin_dashboard.service");
module.exports = {
  getStats: asyncHandler(async (req, res) => {
    const stats = await adminDashboardService.getGlobalStats();
    return successResponse(res, stats, "Dashboard stats fetched", 200);
  })
};
