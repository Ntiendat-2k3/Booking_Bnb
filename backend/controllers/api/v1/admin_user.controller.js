const { successResponse, errorResponse } = require("../../../utils/response");
const adminUserService = require("../../../services/admin_user.service");

module.exports = {
  list: async (_req, res) => {
    try {
      const data = await adminUserService.list();
      return successResponse(res, data, "Users fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  setRole: async (req, res) => {
    try {
      const { role } = req.body || {};
      const data = await adminUserService.setRole(req.params.id, role);
      return successResponse(res, data, "Role updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },
};
