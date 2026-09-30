const express = require("express");
const router = express.Router();

const accountController = require("../../controllers/api/v1/account.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const { upload, uploadErrorHandler } = require("../../middlewares/upload.middleware");
const { uploadLimiter } = require("../../middlewares/rateLimit");
const validate = require("../../middlewares/api/validation.middleware");
const {
  updateProfileSchema,
  changePasswordSchema,
  updateSettingsSchema,
  paymentMethodSchema,
} = require("../../requests/api/v1/account.schema");
const { idParams } = require("../../requests/api/v1/common.schema");

router.get("/me", authMiddleware, accountController.me);
router.patch("/me", authMiddleware, csrfMiddleware, validate(updateProfileSchema), accountController.updateProfile);
router.post("/me/change-password", authMiddleware, csrfMiddleware, validate(changePasswordSchema), accountController.changePassword);
router.post(
  "/me/avatar",
  authMiddleware,
  csrfMiddleware,
  uploadLimiter,
  upload.single("image"),
  uploadErrorHandler,
  accountController.uploadAvatar,
);
router.get("/me/settings", authMiddleware, accountController.getSettings);
router.patch("/me/settings", authMiddleware, csrfMiddleware, validate(updateSettingsSchema), accountController.updateSettings);
router.get("/me/payment-methods", authMiddleware, accountController.listPaymentMethods);
router.post("/me/payment-methods", authMiddleware, csrfMiddleware, validate(paymentMethodSchema), accountController.createPaymentMethod);
router.post("/me/payment-methods/:id/default", authMiddleware, csrfMiddleware, validate(idParams, "params"), accountController.setDefaultPaymentMethod);
router.delete("/me/payment-methods/:id", authMiddleware, csrfMiddleware, validate(idParams, "params"), accountController.deletePaymentMethod);

module.exports = router;
