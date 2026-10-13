const { errorResponse } = require("../../utils/response");
const { isAdminRole } = require("../../utils/roles");

/** Kiểm tra vai trò được phép; super_admin kế thừa quyền admin. */
module.exports = (roles = []) => {
  const set = new Set(roles);
  return (req, res, next) => {
    const role = req.user?.user?.role;
    if (!role || (!set.has(role) && !(isAdminRole(role) && set.has("admin")))) {
      return errorResponse(res, "Forbidden", 403);
    }
    next();
  };
};
