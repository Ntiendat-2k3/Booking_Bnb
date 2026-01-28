const { decodeToken } = require("../../utils/jwt");
const { errorResponse } = require("../../utils/response");
const { User } = require("../../models/index");
const { accessCookieName } = require("../../utils/cookies");

module.exports = async (req, res, next) => {
  // Prefer httpOnly access cookie, fallback to Authorization header for dev tools
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
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) return errorResponse(res, "User not found", 401);
    if (user.status !== "active") return errorResponse(res, "User blocked!", 403);

    req.user = { user, exp };
    return next();
  } catch (error) {
    return errorResponse(res, error.message || "Unauthorized", 401);
  }
};
