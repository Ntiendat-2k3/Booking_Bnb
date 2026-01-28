const { decodeToken } = require("../../utils/jwt");
const { errorResponse } = require("../../utils/response");
const { User } = require("../../models/index");

module.exports = async (req, res, next) => {
  const header = req.get("Authorization") || "";
  const accessToken = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!accessToken) {
    return errorResponse(res, "Access token is required", 401);
  }

  try {
    const { userId, exp } = decodeToken(accessToken, "access");

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) return errorResponse(res, "User not found", 401);
    if (user.status !== "active") return errorResponse(res, "User blocked!", 403);

    req.user = {
      user,
      accessToken,
      exp,
    };
    return next();
  } catch (error) {
    return errorResponse(res, error.message || "Unauthorized", 401);
  }
};
