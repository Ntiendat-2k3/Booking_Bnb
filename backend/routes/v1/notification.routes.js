const express = require("express");
const router = express.Router();

const NotificationController = require("../../controllers/api/v1/notification.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const { idParams } = require("../../requests/api/v1/common.schema");

router.get("/me", authMiddleware, NotificationController.getMyNotifications);
router.patch("/:id/read", authMiddleware, csrfMiddleware, validate(idParams, "params"), NotificationController.markAsRead);
router.patch("/read-all", authMiddleware, csrfMiddleware, NotificationController.markAllAsRead);

module.exports = router;
