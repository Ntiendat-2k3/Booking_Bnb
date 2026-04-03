const express = require("express");
const router = express.Router();

const authController = require("../../controllers/api/v1/auth.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const { authLoginLimiter, authRegisterLimiter, authRefreshLimiter } = require("../../middlewares/rateLimit");

// CSRF bootstrap (double-submit cookie)
router.get("/csrf", authController.csrf);

router.post("/register", authRegisterLimiter, authController.register);
router.post("/login", authLoginLimiter, authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.get("/google", authController.googleStart);
router.get("/google/callback", authController.googleCallback);

router.get("/profile", authMiddleware, authController.profile);

router.post("/refresh", authRefreshLimiter, csrfMiddleware, authController.refresh);
router.post("/logout", csrfMiddleware, authController.logout);

module.exports = router;
