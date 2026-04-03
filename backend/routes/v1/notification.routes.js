const express = require("express");
const router = express.Router();

const NotificationController = require("../../controllers/api/v1/notification.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");

router.get("/me", authMiddleware, NotificationController.getMyNotifications);
router.patch("/:id/read", authMiddleware, NotificationController.markAsRead);
router.patch("/read-all", authMiddleware, NotificationController.markAllAsRead);

module.exports = router;
