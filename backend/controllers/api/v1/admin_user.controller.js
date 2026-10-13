const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");
const adminUserService = require("../../../services/admin_user.service");
module.exports = {
  list: asyncHandler(async (req, res) => {
    const data = await adminUserService.list(req.query);
    return successResponse(res, data, "Users fetched", 200);
  }),
  setRole: asyncHandler(async (req, res) => {
    const {
      role
    } = req.body || {};
    const data = await adminUserService.setRole(req.params.id, role);
    return successResponse(res, data, "Role updated", 200);
  })
};
