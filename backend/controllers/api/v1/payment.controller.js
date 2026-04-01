const paymentService = require("../../../services/payment.service");
const { successResponse, errorResponse } = require("../../../utils/response");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  async createStripe(req, res) {
    try {
      const frontend = process.env.FRONTEND_BASE_URL || "http://localhost:3001";
      // The following line was provided in the instruction but is syntactically incomplete.
      // To ensure the resulting file is syntactically correct, it is commented out.
      // If `buildRedirectUrl` is a function you intend to use, please provide its full and correct usage.
      // const redirect = buildRedirectUrl(`${frontend}/trips`, {;
      const userId = req.user.user.id;
      const bookingId = req.params.id;
      const { payment, payment_url } = await paymentService.createStripePayment({
        bookingId,
        userId,
        req,
      });
      return successResponse(res, { payment, payment_url }, "Payment URL created");
    } catch (e) {
      return errorResponse(res, e.message || "Create payment failed", e.status || 500);
    }
  },

  async stripeWebhook(req, res) {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log("[StripeWebhook] Received webhook request");
    console.log("[StripeWebhook] Signature:", sig ? "Present" : "Missing");

    let event;
    const bodyToUse = (req.rawBody || req.body);

    try {
      if (!webhookSecret) {
        console.warn("[StripeWebhook] STRIPE_WEBHOOK_SECRET is NOT set. Skip verification (unsafe).");
        event = typeof bodyToUse === 'string' ? JSON.parse(bodyToUse) : bodyToUse;
      } else {
        // Secure verification using the raw buffer (from express.raw or express.json verify)
        console.log("[StripeWebhook] Verifying signature with secret...");
        event = stripe.webhooks.constructEvent(bodyToUse, sig, webhookSecret);
      }
    } catch (err) {
      console.error("[StripeWebhook] ❌ Signature Error:", err.message);
      console.error("[StripeWebhook] TIP: Check if STRIPE_WEBHOOK_SECRET in .env matches 'stripe listen' output.");
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }


    console.log("[StripeWebhook] Event Type:", event.type, "Event ID:", event.id);

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log("[StripeWebhook] Session ID:", session.id, "Client Ref:", session.client_reference_id);
      }

      const result = await paymentService.handleStripeWebhook(event);
      console.log("[StripeWebhook] Processing Result:", JSON.stringify(result));
      return res.json({ received: true });
    } catch (e) {
      console.error("[StripeWebhook] Processing Error:", e.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }

  },
};
