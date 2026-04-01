const { successResponse, errorResponse } = require("../../../utils/response");
const adminDashboardService = require("../../../services/admin_dashboard.service");

module.exports = {
  getStats: async (req, res) => {
    try {
      const stats = await adminDashboardService.getGlobalStats();
      return successResponse(res, stats, "Dashboard stats fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Failed to fetch stats", e.status || 500);
    }
  },
};
