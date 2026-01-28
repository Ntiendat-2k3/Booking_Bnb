const passport = require("passport");
const authService = require("../../../services/auth.service");
const { successResponse, errorResponse } = require("../../../utils/response");

module.exports = {
  register: async (req, res) => {
    try {
      const data = await authService.registerLocal(
        req.body,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
      );
      return successResponse(res, data, "Register successfully", 201);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  login: (req, res, next) => {
    passport.authenticate("local", { session: false }, async (err, user, info) => {
      if (err) return next(err);
      if (!user) return errorResponse(res, info?.message || "Unauthorized", 401);

      try {
        const tokens = await authService.issueTokens(user, {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        });

        return successResponse(
          res,
          { user: authService.sanitizeUser(user), ...tokens },
          "Login successfully",
          200
        );
      } catch (e) {
        return errorResponse(res, e.message || "Internal server error", e.status || 500);
      }
    })(req, res, next);
  },

  googleStart: passport.authenticate("google", { scope: ["email", "profile"], session: false }),

  googleCallback: (req, res, next) => {
    passport.authenticate("google", { session: false }, async (err, user, info) => {
      if (err) return next(err);
      if (!user) return errorResponse(res, info?.message || "Google auth failed", 401);

      try {
        const tokens = await authService.issueTokens(user, {
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        });

        // mode=json -> trả JSON để test bằng Postman
        if (req.query.mode === "json") {
          return successResponse(
            res,
            { user: authService.sanitizeUser(user), ...tokens },
            "Google login successfully",
            200
          );
        }

        // mặc định redirect về FE
        const url = new URL((process.env.FRONTEND_URL || "http://localhost:3001") + "/auth/callback");
        url.searchParams.set("accessToken", tokens.accessToken);
        url.searchParams.set("refreshToken", tokens.refreshToken);
        return res.redirect(url.toString());
      } catch (e) {
        return errorResponse(res, e.message || "Internal server error", e.status || 500);
      }
    })(req, res, next);
  },

  profile: async (req, res) => {
    return successResponse(res, req.user.user, "User profile fetched", 200);
  },

  refresh: async (req, res) => {
    const { refresh_token: refreshToken } = req.body;
    try {
      const tokens = await authService.refresh(
        refreshToken,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
      );
      return successResponse(res, tokens, "Refreshed", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Invalid refresh token", e.status || 401);
    }
  },

  logout: async (req, res) => {
    const { refresh_token: refreshToken } = req.body;
    await authService.logout(refreshToken);
    return successResponse(res, null, "Logout successfully", 200);
  },
};
