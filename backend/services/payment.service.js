const {
  Payment,
  User,
  Notification,
  sequelize,
  Sequelize
} = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const { getStripe } = require("../config/stripe");
const { enqueue } = require("./background_job.service");
const { message } = require("../templates/emails");
const httpError = require("../utils/httpError");
const { isUuid } = require("../utils/validators");
const bookingRepo = new BookingRepository();
const { Op } = Sequelize;

function snapshotOf(booking) {
  return { check_in: booking.check_in, check_out: booking.check_out, guests_count: booking.guests_count, total_amount: String(booking.total_amount), currency: booking.currency };
}

function matchesSnapshot(payment, booking) {
  const snapshot = payment.payload?.snapshot;
  return !snapshot || Object.entries(snapshot).every(([key, value]) => String(booking[key]) === String(value));
}

async function notifyConfirmed(booking, listing, transaction) {
  const people = await User.findAll({ where: { id: { [Op.in]: [booking.guest_id, listing.host_id] } }, attributes: ["id", "email"], transaction });
  for (const person of people) {
    const isGuest = String(person.id) === String(booking.guest_id);
    const title = isGuest ? "Thanh toán thành công!" : "Có lượt đặt phòng mới!";
    const text = `Đơn đặt phòng cho "${listing.title}" đã được xác nhận.`;
    await Notification.create({ user_id: person.id, type: isGuest ? "booking_confirmed" : "new_booking", title, message: text }, { transaction });
    await enqueue("send_email", { to: person.email, subject: title, html: message(title, [text, `Mã đơn: ${booking.id}`, `Ngày nhận phòng: ${booking.check_in}`, `Ngày trả phòng: ${booking.check_out}`]) }, transaction);
  }
}

module.exports = {
  /** Tạo session ngoài transaction; payment ID làm idempotency key cho cả retry và request đồng thời. */
  async createStripePayment({ bookingId, userId }) {
    const payment = await sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(bookingId, transaction, userId);
      bookingRepo.assertPending(booking);
      if (listing.deleted_at || listing.status !== "published") throw httpError(409, "Listing is no longer available");
      const amount = Number(booking.total_amount);
      if (!Number.isSafeInteger(amount) || amount <= 0) throw httpError(400, "Invalid booking amount");
      const pending = await Payment.findOne({ where: { booking_id: booking.id, provider: "stripe", status: "pending" }, order: [["created_at", "DESC"]], transaction, lock: transaction.LOCK.UPDATE });
      if (pending && matchesSnapshot(pending, booking) && String(pending.amount) === String(booking.total_amount) && pending.currency === booking.currency) return pending;
      return Payment.create({ booking_id: booking.id, provider: "stripe", status: "pending", amount: String(booking.total_amount), currency: booking.currency, payload: { snapshot: snapshotOf(booking) } }, { transaction });
    });
    if (payment.payload?.request?.url) return { payment, payment_url: payment.payload.request.url };
    const frontendBase = process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3001";
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: payment.currency.toLowerCase(), product_data: { name: `Booking ${payment.booking_id}` }, unit_amount: Number(payment.amount) }, quantity: 1 }],
      mode: "payment", success_url: `${frontendBase}/trips?payment=success&bookingId=${payment.booking_id}`,
      cancel_url: `${frontendBase}/trips?payment=failed&bookingId=${payment.booking_id}`,
      client_reference_id: payment.id, metadata: { bookingId: payment.booking_id, paymentId: payment.id },
    }, { idempotencyKey: `checkout:${payment.id}` });
    const result = await sequelize.transaction(async (transaction) => {
      const { booking } = await bookingRepo.lockForMutation(bookingId, transaction, userId);
      const current = await Payment.findByPk(payment.id, { transaction, lock: transaction.LOCK.UPDATE });
      await current.update({ provider_txn_ref: session.id, payload: { ...current.payload, request: { id: session.id, url: session.url } } }, { transaction });
      const active = current.status === "pending" && booking.status === "pending_payment"
        && bookingRepo.holdExpiresAt(booking) > new Date() && matchesSnapshot(current, booking);
      if (!active) await enqueue("stripe_expire_session", { sessionId: session.id }, transaction);
      return { payment: current, active };
    });
    if (!result.active) throw httpError(409, "Booking changed while creating payment; please try again");
    return { payment: result.payment, payment_url: session.url };
  },

  /** Ghi payment, booking và tác vụ hậu xử lý nguyên tử; thanh toán cũ được hoàn tiền thay vì phục hồi lịch đã hủy. */
  async handleStripeWebhook(event) {
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return { success: true, ignored: true };
    const session = event.data?.object;
    if (!isUuid(session?.client_reference_id) || session.payment_status !== "paid") return { success: true, ignored: true };
    const paymentSnapshot = await Payment.findByPk(session.client_reference_id);
    if (!paymentSnapshot) return { success: true, ignored: true };
    return sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(paymentSnapshot.booking_id, transaction);
      const payment = await Payment.findByPk(paymentSnapshot.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (payment.provider !== "stripe" || payment.provider_txn_ref !== session.id) throw httpError(400, "Payment session does not match");
      if (payment.status === "refunded" || payment.payload?.refund_requested) return { success: true, alreadyPaid: true };
      if (payment.status === "succeeded" && booking.status !== "pending_payment") return { success: true, alreadyPaid: true };
      const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      if (!paymentIntent) throw httpError(400, "Payment intent is required");
      let refundReason;
      if (!Number.isSafeInteger(session.amount_total) || String(session.amount_total) !== String(payment.amount)
        || session.currency?.toUpperCase() !== payment.currency?.toUpperCase()) refundReason = "payment_amount_mismatch";
      else if (String(payment.amount) !== String(booking.total_amount) || payment.currency !== booking.currency || !matchesSnapshot(payment, booking)) refundReason = "booking_changed";
      else if (booking.status !== "pending_payment" || bookingRepo.holdExpiresAt(booking) <= new Date()) refundReason = "booking_not_pending";
      else if (listing.deleted_at) refundReason = "listing_deleted";
      const otherPaid = await Payment.findOne({ where: { booking_id: booking.id, status: "succeeded", id: { [Op.ne]: payment.id } }, transaction });
      if (otherPaid) refundReason = "duplicate_payment";
      if (!refundReason) {
        try { await bookingRepo.assertAvailability({ listingId: booking.listing_id, check_in: booking.check_in, check_out: booking.check_out, excludeBookingId: booking.id }, transaction); }
        catch (error) { if (error.status !== 409) throw error; refundReason = "dates_unavailable"; }
      }
      await payment.update({
        status: "succeeded", paid_at: payment.paid_at || new Date(), provider_transaction_no: paymentIntent,
        payload: { ...payment.payload, webhook: { eventId: event.id, sessionId: session.id }, ...(refundReason ? { refund_requested: refundReason } : {}) },
      }, { transaction });
      if (refundReason) {
        await enqueue("stripe_refund", { paymentId: payment.id, paymentIntent }, transaction);
        return { success: true, refundRequested: true };
      }
      await booking.update({ status: "confirmed" }, { transaction });
      await notifyConfirmed(booking, listing, transaction);
      return { success: true, bookingUpdated: true };
    });
  },
};
