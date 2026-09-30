const express = require("express");
const router = express.Router();

const authController = require("../../controllers/api/v1/auth.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const { authLoginLimiter, authRegisterLimiter, authRefreshLimiter } = require("../../middlewares/rateLimit");
const validate = require("../../middlewares/api/validation.middleware");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require("../../requests/api/v1/auth.schema");
const { passwordResetLimiter } = require("../../middlewares/rateLimit");

router.get("/csrf", authController.csrf);

router.post("/register", authRegisterLimiter, validate(registerSchema), authController.register);
router.post("/login", authLoginLimiter, validate(loginSchema), authController.login);
router.post("/forgot-password", passwordResetLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.get("/google", authController.googleStart);
router.get("/google/callback", authController.googleCallback);

router.get("/profile", authMiddleware, authController.profile);

router.post("/refresh", authRefreshLimiter, csrfMiddleware, authController.refresh);
router.post("/logout", csrfMiddleware, authController.logout);

module.exports = router;
