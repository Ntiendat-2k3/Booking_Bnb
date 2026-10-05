const express = require("express");
const router = express.Router();

const authController = require("../../controllers/api/v1/auth.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const { authLoginLimiter, authRegisterLimiter, authRefreshLimiter } = require("../../middlewares/rateLimit");
const validate = require("../../middlewares/api/validation.middleware");
const { registerSchema, loginSchema, googleLinkSchema, forgotPasswordSchema, resetPasswordSchema } = require("../../requests/api/v1/auth.schema");
const { passwordResetLimiter } = require("../../middlewares/rateLimit");
const { errorResponse } = require("../../utils/response");

/** Phiên refresh giữ thời điểm xác thực gốc; thao tác nhạy cảm cần đăng nhập gần đây. */
function recentAuth(req, res, next) {
  if (!Number.isSafeInteger(req.user?.authTime) || Date.now() / 1000 - req.user.authTime > 600) {
    return errorResponse(res, "Recent sign-in required", 401);
  }
  return next();
}

router.get("/csrf", authController.csrf);

router.post("/register", authRegisterLimiter, validate(registerSchema), authController.register);
router.post("/login", authLoginLimiter, validate(loginSchema), authController.login);
router.post("/forgot-password", passwordResetLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.use("/passkeys", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.post("/passkeys/register/options", authMiddleware, recentAuth, csrfMiddleware, authController.passkeyRegisterOptions);
router.post("/passkeys/register/verify", authMiddleware, recentAuth, csrfMiddleware, authController.passkeyRegisterVerify);
router.post("/passkeys/login/options", authLoginLimiter, csrfMiddleware, authController.passkeyLoginOptions);
router.post("/passkeys/login/verify", authLoginLimiter, csrfMiddleware, authController.passkeyLoginVerify);
router.get("/passkeys", authMiddleware, authController.passkeyList);
router.delete("/passkeys/:id", authMiddleware, recentAuth, csrfMiddleware, authController.passkeyRemove);

router.use("/qr", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.post("/qr/start", authLoginLimiter, csrfMiddleware, authController.qrStart);
router.post("/qr/inspect", authLoginLimiter, csrfMiddleware, authController.qrInspect);
router.post("/qr/approve", authLoginLimiter, authMiddleware, recentAuth, csrfMiddleware, authController.qrApprove);
router.get("/qr/status", authController.qrStatus);
router.post("/qr/complete", authLoginLimiter, csrfMiddleware, authController.qrComplete);
router.post("/qr/cancel", csrfMiddleware, authController.qrCancel);
router.post("/qr/cancel-mobile", authLoginLimiter, csrfMiddleware, authController.qrCancelMobile);

router.get("/google", authController.googleStart);
router.get("/google/callback", authController.googleCallback);
router.post("/google/link", authLoginLimiter, csrfMiddleware, validate(googleLinkSchema), authController.googleLink);
router.get("/facebook", authLoginLimiter, authController.facebookStart);
router.get("/facebook/callback", authLoginLimiter, authController.facebookCallback);

router.get("/profile", authMiddleware, authController.profile);
router.get("/sessions", authMiddleware, authController.sessions);
router.delete("/sessions/:id", authMiddleware, csrfMiddleware, authController.revokeSession);
router.post("/sessions/revoke-others", authMiddleware, csrfMiddleware, authController.revokeOtherSessions);

router.post("/refresh", authRefreshLimiter, csrfMiddleware, authController.refresh);
router.post("/logout", csrfMiddleware, authController.logout);

module.exports = router;
