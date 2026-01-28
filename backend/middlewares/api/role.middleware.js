const { errorResponse } = require("../../utils/response");

/**
 * requireRole(["admin","host"])
 */
module.exports = (roles = []) => {
  const set = new Set(roles);
  return (req, res, next) => {
    const role = req.user?.user?.role;
    if (!role || !set.has(role)) return errorResponse(res, "Forbidden", 403);
    next();
  };
};
