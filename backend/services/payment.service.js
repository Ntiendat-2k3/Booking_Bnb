const { Payment, Booking } = require("../models");
const { signParams, verifyReturn } = require("../utils/vnpay");

function formatDateGMT7(d) {
  // yyyyMMddHHmmss in GMT+7
  const dt = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const yyyy = dt.getUTCFullYear();
  const MM = pad(dt.getUTCMonth() + 1);
  const dd = pad(dt.getUTCDate());
  const HH = pad(dt.getUTCHours());
  const mm = pad(dt.getUTCMinutes());
  const ss = pad(dt.getUTCSeconds());
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "127.0.0.1";
}

function asciiSafeOrderInfo(str) {
  // Remove accents/specials. VNPay asks for no Vietnamese accents & special chars.
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _:\-./]/g, "")
    .slice(0, 255);
}

module.exports = {
  async createVnpayPayment({ bookingId, userId, req }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      const err = new Error("Booking not found");
      err.status = 404;
      throw err;
    }
    if (String(booking.guest_id) !== String(userId)) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    if (booking.status !== "pending_payment") {
      const err = new Error("Booking is not pending payment");
      err.status = 400;
      throw err;
    }

    const tmnCode = process.env.VNP_TMNCODE;
    const hashSecret = process.env.VNP_HASHSECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    if (!tmnCode || !hashSecret || !vnpUrl || !returnUrl) {
      const err = new Error("VNPay config missing (VNP_TMNCODE, VNP_HASHSECRET, VNP_URL, VNP_RETURN_URL)");
      err.status = 500;
      throw err;
    }

    const amount = Number(booking.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error("Invalid booking amount");
      err.status = 500;
      throw err;
    }

    const payment = await Payment.create({
      booking_id: booking.id,
      provider: "vnpay",
      status: "pending",
      amount: String(amount),
      currency: booking.currency || "VND",
    });

    const createDate = formatDateGMT7(new Date());
    const expireDate = formatDateGMT7(new Date(Date.now() + 15 * 60 * 1000));
    const ipAddr = getClientIp(req);
    const txnRef = String(payment.id).replace(/-/g, "");

    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: amount * 100,
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: asciiSafeOrderInfo(`Thanh toan booking ${String(booking.id).replace(/-/g, "")}`),
      vnp_OrderType: "other",
      vnp_Locale: process.env.VNP_LOCALE || "vn",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    const secureHash = signParams(params, hashSecret);

    payment.provider_txn_ref = txnRef;
    payment.payload = { request: params };
    await payment.save();

    const url = `${vnpUrl}?${require("../utils/vnpay").buildQuery({ ...params, vnp_SecureHash: secureHash })}`;
    return { payment, payment_url: url };
  },

  async handleVnpayReturn({ query }) {
    const hashSecret = process.env.VNP_HASHSECRET;
    if (!hashSecret) {
      const err = new Error("VNP_HASHSECRET missing");
      err.status = 500;
      throw err;
    }

    const ver = verifyReturn(query, hashSecret);
    if (!ver.ok) {
      const err = new Error("Invalid checksum");
      err.status = 400;
      throw err;
    }

    const txnRef = query.vnp_TxnRef;
    const payment = await Payment.findOne({
      where: { provider: "vnpay", provider_txn_ref: txnRef },
    });
    if (!payment) {
      const err = new Error("Payment not found");
      err.status = 404;
      throw err;
    }

    // Verify amount (VNPay returns amount * 100)
    const vnpAmount = Number(query.vnp_Amount);
    const expectedAmount = Number(payment.amount) * 100;
    if (Number.isFinite(vnpAmount) && Number.isFinite(expectedAmount) && vnpAmount !== expectedAmount) {
      const err = new Error("Amount mismatch");
      err.status = 400;
      throw err;
    }

    // Idempotent handling
    if (payment.status === "succeeded") {
      return { payment, bookingUpdated: false };
    }

    const responseCode = query.vnp_ResponseCode;
    const txnStatus = query.vnp_TransactionStatus;
    const success = responseCode === "00" && (!txnStatus || txnStatus === "00");

    payment.payload = { ...(payment.payload || {}), return: query };
    payment.provider_transaction_no = query.vnp_TransactionNo || payment.provider_transaction_no;

    if (success) {
      payment.status = "succeeded";
      payment.paid_at = new Date();
    } else {
      payment.status = responseCode === "24" ? "cancelled" : "failed";
    }
    await payment.save();

    const booking = await Booking.findByPk(payment.booking_id);
    if (booking) {
      if (success) {
        booking.status = "confirmed";
      }
      await booking.save();
    }

    return { payment, bookingUpdated: true, success, responseCode };
  },

  async handleVnpayIpn({ query }) {
    // Same logic as return, but must respond with RspCode/Message for VNPay
    return module.exports.handleVnpayReturn({ query });
  },
};
