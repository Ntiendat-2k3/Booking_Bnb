const express = require("express");
const router = express.Router();

const bookingController = require("../../controllers/api/v1/booking.controller");
const stayController = require("../../controllers/api/v1/booking-stay.controller");
const paymentController = require("../../controllers/api/v1/payment.controller");
const propertyPaymentController = require("../../controllers/api/v1/property-payment.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const { idParams, pagination } = require("../../requests/api/v1/common.schema");
const { createBookingSchema, updateBookingSchema } = require("../../requests/api/v1/booking.schema");
const { issueQrSchema } = require("../../requests/api/v1/booking-stay.schema");
const { cancelBookingSchema } = require("../../requests/api/v1/cancellation.schema");
const { stayQrIssueLimiter } = require("../../middlewares/rateLimit");
const couponController = require("../../controllers/api/v1/coupon.controller");
const { applyCoupon } = require("../../requests/api/v1/coupon.schema");

router.post("/bookings", authMiddleware, csrfMiddleware, validate(createBookingSchema), bookingController.create);
router.get("/bookings/me", authMiddleware, validate(pagination, "query"), bookingController.myBookings);
router.get("/bookings/:id", authMiddleware, validate(idParams, "params"), bookingController.detail);
router.patch("/bookings/:id", authMiddleware, csrfMiddleware, validate(idParams, "params"), validate(updateBookingSchema), bookingController.update);
router.post("/bookings/:id/coupon", authMiddleware, csrfMiddleware, validate(idParams, "params"),
  validate(applyCoupon), couponController.apply);
router.delete("/bookings/:id/coupon", authMiddleware, csrfMiddleware, validate(idParams, "params"), couponController.remove);
router.get("/bookings/:id/cancellation-quote", authMiddleware, validate(idParams, "params"), bookingController.cancellationQuote);
router.get("/bookings/:id/cancellation", authMiddleware, validate(idParams, "params"), bookingController.cancellationHistory);
router.post("/bookings/:id/cancel", authMiddleware, csrfMiddleware, validate(idParams, "params"), validate(cancelBookingSchema), bookingController.cancel);
router.post("/bookings/:id/checkout", authMiddleware, csrfMiddleware, validate(idParams, "params"), bookingController.checkout);
router.post("/bookings/:id/stay-qr", authMiddleware, stayQrIssueLimiter, csrfMiddleware,
  validate(idParams, "params"), validate(issueQrSchema), stayController.issueQr);
router.get("/bookings/:id/check-in-qr", authMiddleware, validate(idParams, "params"), stayController.verificationQr);
router.post("/bookings/:id/check-in-qr/rotate", authMiddleware, stayQrIssueLimiter, csrfMiddleware,
  validate(idParams, "params"), stayController.rotateVerificationQr);
router.post("/bookings/:id/confirmation-email/resend", authMiddleware, stayQrIssueLimiter, csrfMiddleware,
  validate(idParams, "params"), stayController.resendConfirmation);

router.post("/bookings/:id/payments/stripe", authMiddleware, csrfMiddleware, validate(idParams, "params"), paymentController.createStripe);
router.post("/bookings/:id/payments/property", authMiddleware, csrfMiddleware, validate(idParams, "params"), propertyPaymentController.confirm);
router.post("/bookings/:id/payments/stripe/reconcile", authMiddleware, csrfMiddleware, validate(idParams, "params"), paymentController.reconcileStripe);
router.post("/payments/stripe/webhook", paymentController.stripeWebhook);

module.exports = router;
