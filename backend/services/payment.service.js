const {
  Payment,
  Booking,
  User,
  Notification,
  sequelize,
  Sequelize,
} = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const { bookingCode } = require("../transformers/booking.transformer");
const { getStripe } = require("../config/stripe");
const { enqueue } = require("./background_job.service");
const notifications = require("./notification.service");
const preferences = require("./notification-preference.service");
const { message } = require("../templates/emails");
const bookingQr = require("./booking_qr.service");
const httpError = require("../utils/httpError");
const { isUuid } = require("../utils/validators");
const bookingRepo = new BookingRepository();
  const refunds = require("./refund.service");
  const disputes = require("./payment_dispute.service");
const { Op } = Sequelize;
const coupons = require("./coupon.service");

function snapshotOf(booking) {
  return {
    check_in: booking.check_in,
    check_out: booking.check_out,
    guests_count: booking.guests_count,
    total_amount: String(booking.total_amount),
    currency: booking.currency,
  };
}

function matchesSnapshot(payment, booking) {
  const snapshot = payment.payload?.snapshot;
  return (
    !snapshot ||
    Object.entries(snapshot).every(
      ([key, value]) => String(booking[key]) === String(value),
    )
  );
}

async function notifyConfirmed(booking, listing, transaction) {
  const people = await User.findAll({
    where: { id: { [Op.in]: [booking.guest_id, listing.host_id] } },
    attributes: ["id", "email"],
    transaction,
  });
  for (const person of people) {
    const isGuest = String(person.id) === String(booking.guest_id);
    const title = isGuest ? "Thanh toán thành công!" : "Có lượt đặt phòng mới!";
    const text = `Đơn đặt phòng cho "${listing.title}" đã được xác nhận.`;
    if (await preferences.allows(person.id, "bookings", transaction)) {
      await Notification.create(
        {
          user_id: person.id,
          type: isGuest ? "booking_confirmed" : "new_booking",
          title,
          message: text,
          resource_type: isGuest ? "booking" : "host_booking",
          resource_id: booking.id,
          dedupe_key: `booking:${booking.id}:confirmed`,
        },
        { transaction },
      );
    }
    if (isGuest) {
      await bookingQr.queueConfirmation(booking, transaction);
      continue;
    }
    await enqueue(
      "send_email",
      {
        to: person.email,
        subject: title,
        html: message(title, [
          text,
          `Mã đơn: ${bookingCode(booking.reference_number)}`,
          `Ngày nhận phòng: ${booking.check_in}`,
          `Ngày trả phòng: ${booking.check_out}`,
        ]),
      },
      transaction,
    );
  }
}

module.exports = {
  /** Tạo PaymentIntent cho đúng đơn đang giữ chỗ; ID payment cố định giúp các lần thử lại không tạo giao dịch trùng. */
  async createStripePayment({ bookingId, userId }) {
    const payment = await sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(
        bookingId,
        transaction,
        userId,
      );
      bookingRepo.assertPending(booking);
      if (listing.deleted_at || listing.status !== "published")
        throw httpError(409, "Listing is no longer available");
      const amount = Number(booking.total_amount);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        throw httpError(400, "Invalid booking amount");
      const pending = await Payment.findOne({
        where: {
          booking_id: booking.id,
          provider: "stripe",
          status: "pending",
        },
        order: [["created_at", "DESC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (pending) {
        const matches = matchesSnapshot(pending, booking) &&
          String(pending.amount) === String(booking.total_amount) &&
          pending.currency === booking.currency;
        if (matches && !pending.payload?.request?.url &&
          (!pending.provider_txn_ref || pending.provider_txn_ref.startsWith("pi_"))) return pending;
        await pending.update({ status: "cancelled" }, { transaction });
        if (pending.provider_txn_ref) {
          await enqueue(pending.provider_txn_ref.startsWith("pi_") ? "stripe_cancel_intent" : "stripe_expire_session",
            pending.provider_txn_ref.startsWith("pi_")
              ? { intentId: pending.provider_txn_ref } : { sessionId: pending.provider_txn_ref }, transaction);
        }
      }
      return Payment.create(
        {
          booking_id: booking.id,
          provider: "stripe",
          status: "pending",
          amount: String(booking.total_amount),
          currency: booking.currency,
          payload: { snapshot: snapshotOf(booking) },
        },
        { transaction },
      );
    });
    let intent;
    try {
      intent = payment.payload?.intent?.id
        ? await getStripe().paymentIntents.retrieve(payment.payload.intent.id)
        : await getStripe().paymentIntents.create({
          amount: Number(payment.amount),
          currency: payment.currency.toLowerCase(),
          payment_method_types: ["card"],
          description: `Booking ${payment.booking_id}`,
          metadata: { bookingId: payment.booking_id, paymentId: payment.id },
        }, { idempotencyKey: `intent:${payment.id}` });
    } catch (error) {
      // Lỗi kết nối tạm thời giữ payment ở trạng thái pending để lần thử sau dùng lại cùng khóa Stripe.
      if (["StripeConnectionError", "StripeAPIError", "StripeRateLimitError"].includes(error.type)) {
        throw httpError(503, "Payment provider is temporarily unavailable. Please try again.");
      }
      throw error;
    }
    if (intent.status === "canceled") {
      await Payment.update({ status: "cancelled" }, { where: { id: payment.id, status: "pending" } });
      return this.createStripePayment({ bookingId, userId });
    }
    if (!intent.client_secret || intent.amount !== Number(payment.amount) ||
      intent.currency?.toUpperCase() !== payment.currency?.toUpperCase())
      throw httpError(409, "Payment intent no longer matches booking");
    const result = await sequelize.transaction(async (transaction) => {
      const { booking } = await bookingRepo.lockForMutation(
        bookingId,
        transaction,
        userId,
      );
      const current = await Payment.findByPk(payment.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      await current.update(
        {
          provider_txn_ref: intent.id,
          payload: {
            ...current.payload,
            intent: { id: intent.id },
          },
        },
        { transaction },
      );
      const active =
        current.status === "pending" &&
        booking.status === "pending_payment" &&
        bookingRepo.holdExpiresAt(booking) > new Date() &&
        matchesSnapshot(current, booking);
      if (!active)
        await enqueue(
          "stripe_cancel_intent",
          { intentId: intent.id },
          transaction,
        );
      return { payment: current, active };
    });
    if (!result.active)
      throw httpError(
        409,
        "Booking changed while creating payment; please try again",
      );
    return { payment: result.payment, client_secret: intent.client_secret, status: intent.status };
  },

  /** Đối soát từ Stripe cho khách đang xem đơn; chỉ dữ liệu lấy bằng secret key mới được chuyển vào luồng webhook. */
  async reconcileStripePayment({ bookingId, userId }) {
    const booking = await Booking.findOne({
      where: { id: bookingId, guest_id: userId },
      attributes: ["id", "status"],
    });
    if (!booking) throw httpError(404, "Booking not found");
    const payment = await Payment.findOne({
      where: { booking_id: bookingId, provider: "stripe" },
      order: [["created_at", "DESC"]],
    });
    if (!payment?.provider_txn_ref?.startsWith("pi_"))
      return { booking_status: booking.status, payment_status: "pending" };
    let intent;
    try {
      intent = await getStripe().paymentIntents.retrieve(payment.provider_txn_ref);
    } catch (error) {
      if (["StripeConnectionError", "StripeAPIError", "StripeRateLimitError"].includes(error.type))
        throw httpError(503, "Payment provider is temporarily unavailable. Please try again.");
      throw error;
    }
    if (intent.id !== payment.provider_txn_ref || intent.metadata?.paymentId !== payment.id)
      throw httpError(409, "Payment reference does not match");
    if (intent.status === "succeeded") {
      await this.handleStripeWebhook({
        id: "reconcile:" + intent.id,
        type: "payment_intent.succeeded",
        data: { object: intent },
      });
    }
    const current = await Booking.findByPk(bookingId, { attributes: ["status"] });
    return { booking_status: current.status, payment_status: intent.status };
  },

  /** Ghi payment, booking và tác vụ hậu xử lý nguyên tử; thanh toán cũ được hoàn tiền thay vì phục hồi lịch đã hủy. */
  async handleStripeWebhook(event) {
    if (["refund.created", "refund.updated", "refund.failed"].includes(event.type))
      return refunds.handleStripeEvent(event);
    if (event.type?.startsWith("charge.dispute."))
      return disputes.handleStripeEvent(event);
    const isIntent = event.type === "payment_intent.succeeded";
    if (
      ![
        "payment_intent.succeeded",
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    )
      return { success: true, ignored: true };
    const source = event.data?.object;
    const paymentId = isIntent ? source?.metadata?.paymentId : source?.client_reference_id;
    if (
      !isUuid(paymentId) ||
      (isIntent ? source.status !== "succeeded" : source.payment_status !== "paid")
    )
      return { success: true, ignored: true };
    const paymentSnapshot = await Payment.findByPk(paymentId);
    if (!paymentSnapshot) return { success: true, ignored: true };
    return sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(
        paymentSnapshot.booking_id,
        transaction,
      );
      const payment = await Payment.findByPk(paymentSnapshot.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        payment.provider !== "stripe" ||
        payment.provider_txn_ref !== source.id
      )
        throw httpError(400, "Payment reference does not match");
      if (payment.status === "refunded" || payment.payload?.refund_requested)
        return { success: true, alreadyPaid: true };
      if (
        payment.status === "succeeded" &&
        booking.status !== "pending_payment"
      )
        return { success: true, alreadyPaid: true };
      const paymentIntent = isIntent ? source.id :
        typeof source.payment_intent === "string" ? source.payment_intent : source.payment_intent?.id;
      if (!paymentIntent) throw httpError(400, "Payment intent is required");
      const paidAmount = isIntent ? source.amount_received : source.amount_total;
      let refundReason;
      if (!["pending", "succeeded"].includes(payment.status))
        refundReason = "payment_not_pending";
      else if (
        !Number.isSafeInteger(paidAmount) ||
        String(paidAmount) !== String(payment.amount) ||
        source.currency?.toUpperCase() !== payment.currency?.toUpperCase()
      )
        refundReason = "payment_amount_mismatch";
      else if (
        String(payment.amount) !== String(booking.total_amount) ||
        payment.currency !== booking.currency ||
        !matchesSnapshot(payment, booking)
      )
        refundReason = "booking_changed";
      else if (
        booking.status !== "pending_payment" ||
        bookingRepo.holdExpiresAt(booking) <= new Date()
      )
        refundReason = "booking_not_pending";
      else if (listing.deleted_at) refundReason = "listing_deleted";
      const otherPaid = await Payment.findOne({
        where: {
          booking_id: booking.id,
          status: "succeeded",
          id: { [Op.ne]: payment.id },
        },
        transaction,
      });
      if (otherPaid) refundReason = "duplicate_payment";
      if (!refundReason) {
        try {
          await bookingRepo.assertAvailability(
            {
              listingId: booking.listing_id,
              check_in: booking.check_in,
              check_out: booking.check_out,
              excludeBookingId: booking.id,
            },
            transaction,
          );
        } catch (error) {
          if (error.status !== 409) throw error;
          refundReason = "dates_unavailable";
        }
      }
      await payment.update(
        {
          status: "succeeded",
          paid_at: payment.paid_at || new Date(),
          provider_transaction_no: paymentIntent,
          payload: {
            ...payment.payload,
            webhook: { eventId: event.id, ...(isIntent ? { intentId: source.id } : { sessionId: source.id }) },
            ...(refundReason ? { refund_requested: refundReason } : {}),
          },
        },
        { transaction },
      );
      if (refundReason) {
        await refunds.requestReconciliation({ booking, payment, amount: paidAmount,
          reason: refundReason, transaction });
        return { success: true, refundRequested: true };
      }
      await coupons.confirmForBooking(booking, transaction);
      await booking.update({ status: "confirmed" }, { transaction });
      notifications.publishBookingChanged(transaction, booking, listing);
      await notifyConfirmed(booking, listing, transaction);
      return { success: true, bookingUpdated: true };
    });
  },
};
