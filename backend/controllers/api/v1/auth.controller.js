const passport = require("passport");
const authService = require("../../../services/auth.service");
const { successResponse, errorResponse } = require("../../../utils/response");
const {
  refreshCookieName,
  accessCookieName,
  csrfCookieName,
  refreshCookieOptions,
  accessCookieOptions,
  csrfCookieOptions,
} = require("../../../utils/cookies");
const { generateCsrfToken } = require("../../../utils/csrf");

function ensureCsrfCookie(res, req) {
  // If missing, set a new csrf token cookie (double-submit pattern)
  const existing = req.cookies?.[csrfCookieName()];
  const token = existing || generateCsrfToken();
  if (!existing) {
    res.cookie(csrfCookieName(), token, csrfCookieOptions());
  }
  return token;
}

function setAuthCookies(res, req, { accessToken, refreshToken }) {
  // refresh cookie (httpOnly, /api/v1/auth)
  res.cookie(refreshCookieName(), refreshToken, refreshCookieOptions());
  // access cookie (httpOnly, /)
  res.cookie(accessCookieName(), accessToken, accessCookieOptions());
  // csrf cookie (NOT httpOnly)
  const csrfToken = ensureCsrfCookie(res, req);
  return csrfToken;
}

module.exports = {
  csrf: async (req, res) => {
    const token = ensureCsrfCookie(res, req);
    return successResponse(res, { csrfToken: token }, "CSRF ready", 200);
  },

  register: async (req, res) => {
    try {
      const data = await authService.registerLocal(req.body, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const csrfToken = setAuthCookies(res, req, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      // Don't expose refresh token to JS. Access token is in cookie.
      return successResponse(res, { user: data.user, csrfToken }, "Register successfully", 201);
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

        const csrfToken = setAuthCookies(res, req, tokens);

        return successResponse(
          res,
          { user: authService.sanitizeUser(user), csrfToken },
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

        const csrfToken = setAuthCookies(res, req, tokens);

        if (req.query.mode === "json") {
          return successResponse(
            res,
            { user: authService.sanitizeUser(user), csrfToken },
            "Google login successfully",
            200
          );
        }

        // Redirect về FE, KHÔNG đưa token lên URL
        const url = new URL((process.env.FRONTEND_URL || "http://localhost:3001") + "/auth/callback");
        url.searchParams.set("success", "1");
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
    const refreshToken = req.cookies?.[refreshCookieName()];
    try {
      const tokens = await authService.refresh(refreshToken, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const csrfToken = setAuthCookies(res, req, tokens);

      return successResponse(res, { ok: true, csrfToken }, "Refreshed", 200);
    } catch (e) {
      // clear cookies if invalid/revoked
      res.clearCookie(refreshCookieName(), { path: "/api/v1/auth" });
      res.clearCookie(accessCookieName(), { path: "/" });
      return errorResponse(res, e.message || "Invalid refresh token", e.status || 401);
    }
  },

  logout: async (req, res) => {
    const refreshToken = req.cookies?.[refreshCookieName()];
    await authService.logout(refreshToken);

    res.clearCookie(refreshCookieName(), { path: "/api/v1/auth" });
    res.clearCookie(accessCookieName(), { path: "/" });

    return successResponse(res, null, "Logout successfully", 200);
  },
};
