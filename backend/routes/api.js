const express = require("express");
const router = express.Router();

const authController = require("../controllers/api/v1/auth.controller");
const authMiddleware = require("../middlewares/api/auth.middleware");

router.post("/v1/auth/register", authController.register);
router.post("/v1/auth/login", authController.login);

router.get("/v1/auth/google", authController.googleStart);
router.get("/v1/auth/google/callback", authController.googleCallback);

router.get("/v1/auth/profile", authMiddleware, authController.profile);
router.post("/v1/auth/refresh", authController.refresh);
router.post("/v1/auth/logout", authController.logout);

module.exports = router;
