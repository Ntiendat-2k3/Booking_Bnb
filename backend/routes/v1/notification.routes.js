const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const NotificationController = require("../../controllers/api/v1/notification.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const preferenceSchema = require("../../requests/api/v1/notification.schema");
const { idParams } = require("../../requests/api/v1/common.schema");
const preferenceLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true,
  legacyHeaders: false, keyGenerator: (req) => req.user.user.id });

router.get("/me", authMiddleware, NotificationController.getMyNotifications);
router.get("/preferences", authMiddleware, NotificationController.getPreferences);
router.put("/preferences", authMiddleware, csrfMiddleware, preferenceLimit,
  validate(preferenceSchema), NotificationController.updatePreferences);
router.patch("/:id/read", authMiddleware, csrfMiddleware, validate(idParams, "params"), NotificationController.markAsRead);
router.patch("/read-all", authMiddleware, csrfMiddleware, NotificationController.markAllAsRead);

module.exports = router;
