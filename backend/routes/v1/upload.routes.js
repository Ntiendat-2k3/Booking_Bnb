const express = require("express");
const router = express.Router();

const uploadController = require("../../controllers/api/v1/upload.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const requireRole = require("../../middlewares/api/role.middleware");
const { upload, uploadErrorHandler } = require("../../middlewares/upload.middleware");
const { uploadLimiter } = require("../../middlewares/rateLimit");
const validate = require("../../middlewares/api/validation.middleware");
const { uploadQuerySchema } = require("../../requests/api/v1/host.schema");

router.post(
  "/listing-image",
  authMiddleware,
  requireRole(["admin", "host"]),
  csrfMiddleware,
  validate(uploadQuerySchema, "query"),
  uploadLimiter,
  upload.single("image"),
  uploadErrorHandler,
  uploadController.uploadListingImage,
);

module.exports = router;
