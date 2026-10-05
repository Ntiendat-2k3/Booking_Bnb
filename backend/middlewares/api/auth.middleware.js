const { decodeToken } = require("../../utils/jwt");
const { errorResponse } = require("../../utils/response");
const { User } = require("../../models/index");
const { accessCookieName } = require("../../utils/cookies");
const { sanitizeUser } = require("../../services/auth.service");
const RefreshTokenRepository = require("../../repositories/refresh-token.repository");

const refreshRepo = new RefreshTokenRepository();

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
    const { userId, exp, authTime, sid } = decodeToken(accessToken, "access");

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password_hash", "reset_password_token", "reset_password_expires"] },
    });

    if (!user) return errorResponse(res, "User not found", 401);
    if (user.status !== "active") return errorResponse(res, "User blocked!", 403);

    if (sid) {
      const session = await refreshRepo.findActiveSession(userId, sid);
      if (!session) return errorResponse(res, "Invalid or expired token", 401);
      if (!session.last_active_at || Date.now() - new Date(session.last_active_at).getTime() >= 5 * 60_000) {
        await refreshRepo.touchSession(session.id);
      }
    }

    req.user = { user: sanitizeUser(user), exp, authTime, sessionId: sid || null };
    return next();
  } catch (error) {
    if (error.status === 401) return errorResponse(res, "Invalid or expired token", 401);
    return next(error);
  }
};
