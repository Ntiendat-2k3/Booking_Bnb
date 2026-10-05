const passport = require("passport");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const authService = require("../../../services/auth.service");
const socialOauth = require("../../../services/social_oauth.service");
const passkeys = require("../../../services/passkey.service");
const qrLogin = require("../../../services/qr_login.service");
const qrSocket = require("../../../services/qr_login.socket");
const { User } = require("../../../models");
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/api/v1/auth/${provider}/callback`,
    maxAge: 5 * 60_000,
  };
}

function googleLinkCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: 5 * 60_000,
  };
}

function passkeyCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/api/v1/auth/passkeys", maxAge: 5 * 60_000 };
}

function qrCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/api/v1/auth/qr", maxAge: qrLogin.TTL_SECONDS * 1000 };
}

/** Tách khóa ký phiên liên kết khỏi access token để hai loại token không dùng lẫn nhau. */
function googleLinkSecret() {
  return crypto.createHmac("sha256", process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET)
    .update("google-link")
    .digest();
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
    res.cookie(`oauth_state_${provider}`, state, socialStateCookie(provider));
    return res.redirect(socialOauth.authorizationUrl(config, state));
  };
}

function socialCallback(provider) {
  return async (req, res) => {
    const cookieName = `oauth_state_${provider}`;
    const expectedState = req.cookies?.[cookieName];
    const { maxAge: _maxAge, ...cookieOptions } = socialStateCookie(provider);
    res.clearCookie(cookieName, cookieOptions);
    const state = req.query.state;
    const code = req.query.code;
    if (!expectedState || typeof state !== "string" || typeof code !== "string" ||
        state.length !== expectedState.length ||
        !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))) {
      return socialFailure(res);
    }
    const config = socialOauth.configFor(provider);
    if (!config) return socialFailure(res, "not_configured");
    try {
      const profile = await socialOauth.facebookProfile(code, config);
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
      if (info?.googleLink) {
        const token = jwt.sign({ type: "google-link", ...info.googleLink }, googleLinkSecret(), {
          audience: "google-link",
          expiresIn: "5m",
        });
        res.cookie("google_link", token, googleLinkCookieOptions());
        const url = new URL("/login", process.env.FRONTEND_URL || "http://localhost:3001");
        url.searchParams.set("google_link", "1");
        return res.redirect(url.toString());
      }
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

  googleLink: asyncHandler(async (req, res) => {
    let pending;
    try {
      pending = jwt.verify(req.cookies?.google_link || "", googleLinkSecret(), {
        audience: "google-link",
      });
    } catch {
      return errorResponse(res, "Google linking session expired", 401);
    }
    if (pending.type !== "google-link" || !pending.googleId || !pending.email) {
      return errorResponse(res, "Google linking session invalid", 401);
    }
    const result = await authService.linkGoogleAccount({
      googleId: pending.googleId,
      email: pending.email,
      identifier: req.body.email,
      password: req.body.password,
    }, { ip: req.ip, userAgent: req.headers["user-agent"] });
    res.clearCookie("google_link", { path: "/api/v1/auth" });
    const csrfToken = setAuthCookies(res, req, result);
    return successResponse(res, { user: result.user, csrfToken }, "Google account linked", 200);
  }),

  passkeyRegisterOptions: asyncHandler(async (req, res) => {
    const { options, ceremonyId } = await passkeys.registrationOptions(req.user.user);
    res.cookie("passkey_register", ceremonyId, passkeyCookieOptions());
    res.set("Cache-Control", "no-store");
    return successResponse(res, options);
  }),

  passkeyRegisterVerify: asyncHandler(async (req, res) => {
    let passkey;
    try {
      passkey = await passkeys.verifyRegistration(req.user.user.id,
        req.cookies?.passkey_register, req.body?.response, req.body?.name);
    } finally {
      res.clearCookie("passkey_register", { path: "/api/v1/auth/passkeys" });
    }
    return successResponse(res, passkey, "Passkey registered", 201);
  }),

  passkeyLoginOptions: asyncHandler(async (_req, res) => {
    const { options, ceremonyId } = await passkeys.authenticationOptions();
    res.cookie("passkey_login", ceremonyId, passkeyCookieOptions());
    res.set("Cache-Control", "no-store");
    return successResponse(res, options);
  }),

  passkeyLoginVerify: asyncHandler(async (req, res) => {
    let user;
    try {
      user = await passkeys.verifyAuthentication(req.cookies?.passkey_login, req.body?.response);
    } finally {
      res.clearCookie("passkey_login", { path: "/api/v1/auth/passkeys" });
    }
    const tokens = await authService.issueTokens(user, { ip: req.ip, userAgent: req.headers["user-agent"] });
    const csrfToken = setAuthCookies(res, req, tokens);
    return successResponse(res, { user: authService.sanitizeUser(user), csrfToken }, "Passkey login successful");
  }),

  passkeyList: asyncHandler(async (req, res) => {
    return successResponse(res, await passkeys.list(req.user.user.id));
  }),

  passkeyRemove: asyncHandler(async (req, res) => {
    await passkeys.remove(req.user.user, req.params.id);
    return successResponse(res, { ok: true });
  }),

  qrStart: asyncHandler(async (req, res) => {
    const { id, binding, socketTicket, displayCode, expiresAt, url } = await qrLogin.start(req.headers["user-agent"]);
    res.cookie(qrLogin.desktopCookieName(id), binding, qrCookieOptions());
    return successResponse(res, { id, socketTicket, displayCode, expiresAt, url });
  }),

  qrInspect: asyncHandler(async (req, res) => {
    const { id, scanCookie, changed, ...details } = await qrLogin.inspect(req.body?.code, req.cookies?.qr_scan);
    res.cookie("qr_scan", scanCookie, qrCookieOptions());
    if (changed) qrSocket.emitStatus(id, "scanned");
    return successResponse(res, details);
  }),

  qrApprove: asyncHandler(async (req, res) => {
    const id = await qrLogin.approve(req.body?.code, req.user.user.id, req.cookies?.qr_scan);
    res.clearCookie("qr_scan", { path: "/api/v1/auth/qr" });
    qrSocket.emitStatus(id, "confirmed");
    return successResponse(res, { ok: true });
  }),

  qrStatus: asyncHandler(async (req, res) => {
    const id = req.query?.id;
    return successResponse(res, await qrLogin.desktopStatus(id, req.cookies?.[qrLogin.desktopCookieName(id)]));
  }),

  qrComplete: asyncHandler(async (req, res) => {
    const id = req.body?.id;
    const { userId } = await qrLogin.complete(id, req.cookies?.[qrLogin.desktopCookieName(id)]);
    res.clearCookie(qrLogin.desktopCookieName(id), { path: "/api/v1/auth/qr" });
    const user = await User.findByPk(userId);
    if (!user || user.status !== "active") return errorResponse(res, "QR login unavailable", 401);
    const tokens = await authService.issueTokens(user, { ip: req.ip, userAgent: req.headers["user-agent"] });
    const csrfToken = setAuthCookies(res, req, tokens);
    qrSocket.emitStatus(id, "consumed");
    return successResponse(res, { user: authService.sanitizeUser(user), csrfToken }, "QR login successful");
  }),

  qrCancel: asyncHandler(async (req, res) => {
    const id = req.body?.id;
    await qrLogin.cancel(id, req.cookies?.[qrLogin.desktopCookieName(id)]);
    res.clearCookie(qrLogin.desktopCookieName(id), { path: "/api/v1/auth/qr" });
    qrSocket.emitStatus(id, "cancelled");
    return successResponse(res, { ok: true });
  }),

  qrCancelMobile: asyncHandler(async (req, res) => {
    const id = await qrLogin.cancelMobile(req.body?.code, req.cookies?.qr_scan);
    res.clearCookie("qr_scan", { path: "/api/v1/auth/qr" });
    qrSocket.emitStatus(id, "cancelled");
    return successResponse(res, { ok: true });
  }),

  facebookStart: socialStart("facebook"),
  facebookCallback: socialCallback("facebook"),

  profile: asyncHandler(async (req, res) => {
    return successResponse(res, req.user.user, "User profile fetched", 200);
  }),

  sessions: asyncHandler(async (req, res) => {
    const sessionId = req.user.sessionId ||
      await authService.sessionIdForRefresh(req.cookies?.[refreshCookieName()], req.user.user.id);
    return successResponse(res, await authService.listSessions(req.user.user.id, sessionId));
  }),

  revokeSession: asyncHandler(async (req, res) => {
    const sessionId = req.user.sessionId ||
      await authService.sessionIdForRefresh(req.cookies?.[refreshCookieName()], req.user.user.id);
    await authService.revokeSession(req.user.user.id, req.params.id);
    if (req.params.id === sessionId) {
      res.clearCookie(refreshCookieName(), { path: "/api/v1/auth" });
      res.clearCookie(accessCookieName(), { path: "/" });
    }
    return successResponse(res, { current: req.params.id === sessionId });
  }),

  revokeOtherSessions: asyncHandler(async (req, res) => {
    const sessionId = req.user.sessionId ||
      await authService.sessionIdForRefresh(req.cookies?.[refreshCookieName()], req.user.user.id);
    await authService.revokeOtherSessions(req.user.user.id, sessionId);
    return successResponse(res, { ok: true });
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
