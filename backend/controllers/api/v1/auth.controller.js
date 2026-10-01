const passport = require("passport");
const crypto = require("node:crypto");
const authService = require("../../../services/auth.service");
const socialOauth = require("../../../services/social_oauth.service");
const { successResponse, errorResponse } = require("../../../utils/response");
const { refreshCookieName, accessCookieName, csrfCookieName, refreshCookieOptions, accessCookieOptions, csrfCookieOptions,  } = require("../../../utils/cookies");
const { generateCsrfToken } = require("../../../utils/csrf");
const asyncHandler = require("../../../utils/asyncHandler");

function ensureCsrfCookie(res, req) {
  const existing = req.cookies?.[csrfCookieName()];
  const token = existing || generateCsrfToken();
  if (!existing) {
    res.cookie(csrfCookieName(), token, csrfCookieOptions());
  }
  return token;
}

function setAuthCookies(res, req, { accessToken, refreshToken }) {
  res.cookie(refreshCookieName(), refreshToken, refreshCookieOptions());
  res.cookie(accessCookieName(), accessToken, accessCookieOptions());
  const csrfToken = ensureCsrfCookie(res, req);
  return csrfToken;
}

function socialStateCookie(provider) {
  return {
    httpOnly: true,
    secure: provider === "apple" || process.env.NODE_ENV === "production",
    sameSite: provider === "apple" ? "none" : "lax",
    path: `/api/v1/auth/${provider}/callback`,
    maxAge: 5 * 60_000,
  };
}

function socialFailure(res, reason = "failed") {
  const url = new URL("/login", process.env.FRONTEND_URL || "http://localhost:3001");
  url.searchParams.set("oauth_error", reason);
  return res.redirect(url.toString());
}

function socialStart(provider) {
  return (req, res) => {
    const config = socialOauth.configFor(provider);
    if (!config) return socialFailure(res, "not_configured");
    const state = crypto.randomBytes(24).toString("base64url");
    const nonce = crypto.randomBytes(24).toString("base64url");
    res.cookie(`oauth_state_${provider}`, `${state}.${nonce}`, socialStateCookie(provider));
    return res.redirect(socialOauth.authorizationUrl(provider, config, state, nonce));
  };
}

function socialCallback(provider) {
  return async (req, res) => {
    const cookieName = `oauth_state_${provider}`;
    const stored = req.cookies?.[cookieName];
    const { maxAge: _maxAge, ...cookieOptions } = socialStateCookie(provider);
    res.clearCookie(cookieName, cookieOptions);
    const [expectedState, nonce] = typeof stored === "string" ? stored.split(".") : [];
    const state = provider === "apple" ? req.body?.state : req.query.state;
    const code = provider === "apple" ? req.body?.code : req.query.code;
    if (!expectedState || !nonce || typeof state !== "string" || typeof code !== "string" ||
        state.length !== expectedState.length ||
        !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))) {
      return socialFailure(res);
    }
    const config = socialOauth.configFor(provider);
    if (!config) return socialFailure(res, "not_configured");
    try {
      const profile = provider === "apple"
        ? await socialOauth.appleProfile(code, nonce, config, req.body?.user)
        : await socialOauth.facebookProfile(code, config);
      const user = await authService.findOrCreateSocialUser(profile);
      const tokens = await authService.issueTokens(user, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      setAuthCookies(res, req, tokens);
      const url = new URL("/auth/callback", process.env.FRONTEND_URL || "http://localhost:3001");
      url.searchParams.set("success", "1");
      return res.redirect(url.toString());
    } catch (error) {
      const reason = error.status === 409 ? "email_in_use" : "failed";
      return socialFailure(res, reason);
    }
  };
}

module.exports = {
  csrf: asyncHandler(async (req, res) => {
    const token = ensureCsrfCookie(res, req);
    return successResponse(res, { csrfToken: token }, "CSRF ready", 200);
  }),

  register: asyncHandler(async (req, res) => {
    const data = await authService.registerLocal(req.body, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    const csrfToken = setAuthCookies(res, req, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return successResponse(res, { user: data.user, csrfToken }, "Register successfully", 201);
  }),

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
        return next(e);
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

        const url = new URL((process.env.FRONTEND_URL || "http://localhost:3001") + "/auth/callback");
        url.searchParams.set("success", "1");
        return res.redirect(url.toString());
      } catch (e) {
        return next(e);
      }
    })(req, res, next);
  },

  appleStart: socialStart("apple"),
  appleCallback: socialCallback("apple"),
  facebookStart: socialStart("facebook"),
  facebookCallback: socialCallback("facebook"),

  profile: asyncHandler(async (req, res) => {
    return successResponse(res, req.user.user, "User profile fetched", 200);
  }),

  refresh: async (req, res, next) => {
    const refreshToken = req.cookies?.[refreshCookieName()];
    try {
      const tokens = await authService.refresh(refreshToken, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const csrfToken = setAuthCookies(res, req, tokens);

      return successResponse(res, { ok: true, csrfToken }, "Refreshed", 200);
    } catch (e) {
      // Chỉ xóa cookie khi token không hợp lệ; lỗi DB tạm thời vẫn cho phép thử lại.
      if ([400, 401, 403].includes(e.status)) {
        res.clearCookie(refreshCookieName(), { path: "/api/v1/auth" });
        res.clearCookie(accessCookieName(), { path: "/" });
      }
      return next(e);
    }
  },

  logout: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[refreshCookieName()];
    await authService.logout(refreshToken);

    res.clearCookie(refreshCookieName(), { path: "/api/v1/auth" });
    res.clearCookie(accessCookieName(), { path: "/" });

    return successResponse(res, null, "Logout successfully", 200);
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    return successResponse(res, null, "If the account exists, a reset link will be sent", 200);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return successResponse(res, null, "Mật khẩu đã được thay đổi thành công", 200);
  }),
};
