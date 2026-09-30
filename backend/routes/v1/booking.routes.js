const express = require("express");
const router = express.Router();

const bookingController = require("../../controllers/api/v1/booking.controller");
const paymentController = require("../../controllers/api/v1/payment.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const { idParams, pagination } = require("../../requests/api/v1/common.schema");
const { createBookingSchema, updateBookingSchema } = require("../../requests/api/v1/booking.schema");

router.post("/bookings", authMiddleware, csrfMiddleware, validate(createBookingSchema), bookingController.create);
router.get("/bookings/me", authMiddleware, validate(pagination, "query"), bookingController.myBookings);
router.get("/bookings/:id", authMiddleware, validate(idParams, "params"), bookingController.detail);
router.patch("/bookings/:id", authMiddleware, csrfMiddleware, validate(idParams, "params"), validate(updateBookingSchema), bookingController.update);
router.post("/bookings/:id/cancel", authMiddleware, csrfMiddleware, validate(idParams, "params"), bookingController.cancel);
router.post("/bookings/:id/checkout", authMiddleware, csrfMiddleware, validate(idParams, "params"), bookingController.checkout);

router.post("/bookings/:id/payments/stripe", authMiddleware, csrfMiddleware, validate(idParams, "params"), paymentController.createStripe);
router.post("/payments/stripe/webhook", paymentController.stripeWebhook);

module.exports = router;
