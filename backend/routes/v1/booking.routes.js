const express = require("express");
const router = express.Router();

const bookingController = require("../../controllers/api/v1/booking.controller");
const paymentController = require("../../controllers/api/v1/payment.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");

// Bookings
router.post("/bookings", authMiddleware, csrfMiddleware, bookingController.create);
router.get("/bookings/me", authMiddleware, bookingController.myBookings);
router.get("/bookings/:id", authMiddleware, bookingController.detail);
router.patch("/bookings/:id", authMiddleware, csrfMiddleware, bookingController.update);
router.post("/bookings/:id/cancel", authMiddleware, csrfMiddleware, bookingController.cancel);
router.post("/bookings/:id/checkout", authMiddleware, csrfMiddleware, bookingController.checkout);

// Payments
router.post("/bookings/:id/payments/stripe", authMiddleware, csrfMiddleware, paymentController.createStripe);
router.post("/payments/stripe/webhook", paymentController.stripeWebhook);

module.exports = router;
