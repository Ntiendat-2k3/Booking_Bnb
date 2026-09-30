const { decodeToken } = require("../../utils/jwt");
const { errorResponse } = require("../../utils/response");
const { User } = require("../../models/index");
const { accessCookieName } = require("../../utils/cookies");
const { sanitizeUser } = require("../../services/auth.service");

module.exports = async (req, res, next) => {
  // Ưu tiên cookie httpOnly; hỗ trợ Bearer token cho client API.
  const cookieToken = req.cookies?.[accessCookieName()];

  const header = req.get("Authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;

  const accessToken = cookieToken || bearer;

  if (!accessToken) {
    return errorResponse(res, "Access token is required", 401);
  }

  try {
    const { userId, exp } = decodeToken(accessToken, "access");

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password_hash", "reset_password_token", "reset_password_expires"] },
    });

    if (!user) return errorResponse(res, "User not found", 401);
    if (user.status !== "active") return errorResponse(res, "User blocked!", 403);

    req.user = { user: sanitizeUser(user), exp };
    return next();
  } catch (error) {
    if (error.status === 401) return errorResponse(res, "Invalid or expired token", 401);
    return next(error);
  }
};
