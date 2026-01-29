const { successResponse, errorResponse } = require("../../../utils/response");
const { User } = require("../../../models");

// POST /api/v1/host/apply  (guest -> host)
module.exports = {
  apply: async (req, res) => {
    try {
      const user = req.user?.user;
      if (!user) return errorResponse(res, "Unauthorized", 401);

      if (user.role === "admin" || user.role === "host") {
        // idempotent
        const fresh = await User.findByPk(user.id, { attributes: { exclude: ["password_hash"] } });
        return successResponse(res, fresh, "Already host", 200);
      }

      if (user.role !== "guest") return errorResponse(res, "Invalid role", 400);

      await User.update({ role: "host" }, { where: { id: user.id } });
      const fresh = await User.findByPk(user.id, { attributes: { exclude: ["password_hash"] } });
      return successResponse(res, fresh, "Upgraded to host", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Upgrade failed", 500);
    }
  },
};
