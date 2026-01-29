const paymentService = require("../../../services/payment.service");
const { successResponse, errorResponse } = require("../../../utils/response");

function buildRedirectUrl(base, params) {
  const u = new URL(base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  });
  return u.toString();
}

module.exports = {
  async createVnpay(req, res) {
    try {
      const userId = req.user.user.id;
      const bookingId = req.params.id;
      const { payment, payment_url } = await paymentService.createVnpayPayment({
        bookingId,
        userId,
        req,
      });
      return successResponse(res, { payment, payment_url }, "Payment URL created");
    } catch (e) {
      return errorResponse(res, e.message || "Create payment failed", e.status || 500);
    }
  },

  // Browser redirect after payment at VNPay
  async vnpayReturn(req, res) {
    try {
      const result = await paymentService.handleVnpayReturn({ query: req.query });
      const frontend = process.env.FRONTEND_BASE_URL || "http://localhost:3001/trips";
      const redirect = buildRedirectUrl(frontend, {
        payment: result.success ? "success" : "failed",
        bookingId: result.payment?.booking_id,
        paymentId: result.payment?.id,
        code: result.responseCode,
      });
      return res.redirect(redirect);
    } catch (e) {
      const frontend = process.env.FRONTEND_BASE_URL || "http://localhost:3001/trips";
      const redirect = buildRedirectUrl(frontend, {
        payment: "error",
        message: e.message,
      });
      return res.redirect(redirect);
    }
  },

  // Server-to-server notify (IPN)
  async vnpayIpn(req, res) {
    try {
      await paymentService.handleVnpayIpn({ query: req.query });
      return res.json({ RspCode: "00", Message: "success" });
    } catch (e) {
      // VNPay: 97 checksum, 01 order not found/invalid, 99 unknown
      const code = e.message?.toLowerCase().includes("checksum") ? "97" : "99";
      return res.json({ RspCode: code, Message: e.message || "error" });
    }
  },
};
