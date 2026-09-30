const paymentService = require("../../../services/payment.service");
const { getStripe } = require("../../../config/stripe");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");
const httpError = require("../../../utils/httpError");
module.exports = {
  createStripe: asyncHandler(async (req, res) => {
    const data = await paymentService.createStripePayment({
      bookingId: req.params.id,
      userId: req.user.user.id
    });
    return successResponse(res, data, "Payment URL created");
  }),
  stripeWebhook: asyncHandler(async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw httpError(503, "Stripe webhook is not configured");
    const signature = req.headers["stripe-signature"];
    const body = req.rawBody || req.body;
    if (!signature || !Buffer.isBuffer(body)) throw httpError(400, "Invalid webhook payload");
    let event;
    try {
      event = getStripe().webhooks.constructEvent(body, signature, secret);
    } catch {
      throw httpError(400, "Invalid webhook signature");
    }
    await paymentService.handleStripeWebhook(event);
    return res.json({
      received: true
    });
  })
};
