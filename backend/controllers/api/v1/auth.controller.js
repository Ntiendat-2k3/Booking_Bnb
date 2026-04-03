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
const asyncHandler = require("../../../utils/asyncHandler");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { User } = require("../../../models/index");
const { Op } = require("sequelize");
const { sendEmail } = require("../../../utils/mailer");

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

        const url = new URL((process.env.FRONTEND_URL || "http://localhost:3001") + "/auth/callback");
        url.searchParams.set("success", "1");
        return res.redirect(url.toString());
      } catch (e) {
        return errorResponse(res, e.message || "Internal server error", e.status || 500);
      }
    })(req, res, next);
  },

  profile: asyncHandler(async (req, res) => {
    return successResponse(res, req.user.user, "User profile fetched", 200);
  }),

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

  logout: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[refreshCookieName()];
    await authService.logout(refreshToken);

    res.clearCookie(refreshCookieName(), { path: "/api/v1/auth" });
    res.clearCookie(accessCookieName(), { path: "/" });

    return successResponse(res, null, "Logout successfully", 200);
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return errorResponse(res, "Email is required", 400);

    const user = await User.findOne({ where: { email, provider: "local" } });
    if (!user) return errorResponse(res, "Cannot find user with this email or user logged in via Google.", 404);

    const token = crypto.randomBytes(32).toString("hex");
    user.reset_password_token = token;
    user.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3001"}/reset-password?token=${token}`;

    const html = `
      <h3>Xin chào,</h3>
      <p>Bạn đã yêu cầu khôi phục mật khẩu. Vui lòng nhấn vào đường dẫn bên dưới để đặt lại mật khẩu:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Link này có hiệu lực trong 1 giờ.</p>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      <br/>
      <p>Trân trọng,<br/>Đội ngũ Booking BnB</p>
    `;
    await sendEmail(email, "Khôi phục mật khẩu - Booking BnB", html);

    return successResponse(res, { message: "Reset link has been sent to your email." }, "Email sent", 200);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return errorResponse(res, "Token and new password are required", 400);

    const user = await User.findOne({
      where: {
        reset_password_token: token,
        reset_password_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) return errorResponse(res, "Token is invalid or has expired.", 400);

    const password_hash = await bcrypt.hash(newPassword, 10);
    user.password_hash = password_hash;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    return successResponse(res, null, "Mật khẩu đã được thay đổi thành công.", 200);
  }),
};
