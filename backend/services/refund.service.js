"use strict";

/** Stripe chạy ngoài transaction; kết quả được đối chiếu lại trước khi đổi trạng thái tiền. */
const { Booking, Payment, Refund, RefundEvent, User, Notification, sequelize, Sequelize } = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const { getStripe } = require("../config/stripe");
const { enqueue } = require("./background_job.service");
const preferences = require("./notification-preference.service");
const notifications = require("./notification.service");
const { message } = require("../templates/emails");
const { bookingCode } = require("../transformers/booking.transformer");
const httpError = require("../utils/httpError");
const { isUuid } = require("../utils/validators");

const bookingRepo = new BookingRepository();
const { Op } = Sequelize;

/** Thanh toán bất thường cũng đi qua bảng refund để Admin thấy và worker không tạo lệnh trùng. */
async function requestReconciliation({ booking, payment, amount, reason, transaction }) {
  const [refund, created] = await Refund.findOrCreate({
    where: { source_key: `reconcile:${payment.id}` },
    defaults: { booking_id: booking.id, payment_id: payment.id, amount: String(amount),
      currency: payment.currency, status: "requested", attempt: 1, failure_reason: reason },
    transaction,
  });
  if (created) {
    await RefundEvent.create({ refund_id: refund.id, action: "requested", note: reason }, { transaction });
    await enqueue("stripe_refund", { refundId: refund.id }, transaction);
  }
  return refund;
}

async function notifyRefund({ refund, booking, listing, transaction }) {
  const success = refund.status === "succeeded";
  const title = success ? "Đã hoàn tiền đặt phòng" : "Hoàn tiền cần được hỗ trợ";
  const text = success
    ? `Khoản hoàn ${refund.amount} ${refund.currency} cho đơn ${bookingCode(booking.reference_number)} đã được Stripe xác nhận.`
    : `Khoản hoàn cho đơn ${bookingCode(booking.reference_number)} cần được kiểm tra thêm.`;
  const people = await User.findAll({ where: { id: { [Op.in]: [booking.guest_id, listing.host_id] } },
    attributes: ["id", "email"], transaction });
  for (const person of people) {
    if (await preferences.allows(person.id, "bookings", transaction)) {
      await Notification.findOrCreate({
        where: { user_id: person.id, dedupe_key: `refund:${refund.id}:${refund.status}:${refund.attempt}` },
        defaults: { type: success ? "refund_succeeded" : "refund_failed", title, message: text,
          resource_type: String(person.id) === String(booking.guest_id) ? "booking" : "host_booking",
          resource_id: booking.id }, transaction,
      });
    }
    if (person.email) await enqueue("send_email", {
      to: person.email, subject: title, html: message(title, [text, `Chỗ nghỉ: ${listing.title}`]),
    }, transaction);
  }
  notifications.publishBookingChanged(transaction, booking, listing);
}

/** Chỉ Stripe object khớp payment, số tiền và loại tiền mới được ghi nhận. */
async function applyProviderRefund(providerRefund, providerEventId) {
  const id = providerRefund?.metadata?.refundId;
  const snapshot = isUuid(id) ? await Refund.findByPk(id) :
    providerRefund?.id ? await Refund.findOne({ where: { stripe_refund_id: providerRefund.id } }) : null;
  if (!snapshot) return { ignored: true };
  return sequelize.transaction(async (transaction) => {
    const { booking, listing } = await bookingRepo.lockForMutation(snapshot.booking_id, transaction);
    const payment = await Payment.findByPk(snapshot.payment_id, { transaction, lock: transaction.LOCK.UPDATE });
    const refund = await Refund.findByPk(snapshot.id, { transaction, lock: transaction.LOCK.UPDATE });
    const paymentIntent = typeof providerRefund.payment_intent === "string"
      ? providerRefund.payment_intent : providerRefund.payment_intent?.id;
    if (!payment || !refund || payment.booking_id !== booking.id ||
      (refund.stripe_refund_id && refund.stripe_refund_id !== providerRefund.id) ||
      payment.provider_transaction_no !== paymentIntent ||
      String(providerRefund.amount) !== String(refund.amount) ||
      providerRefund.currency?.toUpperCase() !== refund.currency?.toUpperCase())
      throw httpError(409, "Refund reference does not match payment");
    if (providerEventId) {
      const prior = await RefundEvent.findOne({ where: { provider_event_id: providerEventId }, transaction });
      if (prior) return { refund, repeated: true };
    }
    const nextStatus = providerRefund.status === "succeeded" ? "succeeded" :
      ["failed", "canceled"].includes(providerRefund.status) ? "failed" : "processing";
    const changed = refund.status !== nextStatus;
    await refund.update({ status: nextStatus, stripe_refund_id: providerRefund.id,
      failure_reason: nextStatus === "failed" ? (providerRefund.failure_reason || "Stripe refund failed") : null,
      provider_updated_at: new Date(), }, { transaction });
    await RefundEvent.create({ refund_id: refund.id, provider_event_id: providerEventId || null,
      action: nextStatus, note: nextStatus === "failed" ? refund.failure_reason : null }, { transaction });
    if (nextStatus === "succeeded" &&
      (refund.source_key.startsWith("reconcile:") || BigInt(refund.amount) >= BigInt(payment.amount)))
      await payment.update({ status: "refunded" }, { transaction });
    if (nextStatus === "failed" && payment.status === "refunded")
      await payment.update({ status: "succeeded" }, { transaction });
    if (changed && ["succeeded", "failed"].includes(nextStatus))
      await notifyRefund({ refund, booking, listing, transaction });
    return { refund };
  });
}

/** Retry cùng attempt dùng lại khóa Stripe; attempt mới chỉ do Admin mở sau khi Stripe xác nhận thất bại. */
async function processRefund(refundId) {
  const refund = await Refund.findByPk(refundId);
  if (!refund || refund.status === "succeeded" || refund.status === "manual_review" || refund.status === "failed") return;
  const payment = await Payment.findByPk(refund.payment_id);
  if (!payment?.provider_transaction_no?.startsWith("pi_") ||
    !["succeeded", "refunded"].includes(payment.status))
    throw new Error("Paid Stripe PaymentIntent not available for refund");
  const stripe = getStripe();
  let providerRefund;
  try {
    providerRefund = refund.stripe_refund_id
      ? await stripe.refunds.retrieve(refund.stripe_refund_id)
      : await stripe.refunds.create({ payment_intent: payment.provider_transaction_no,
        amount: Number(refund.amount), reason: "requested_by_customer",
        metadata: { refundId: refund.id, bookingId: refund.booking_id, paymentId: payment.id } },
      { idempotencyKey: `refund:${refund.id}:${refund.attempt}` });
  } catch (error) {
    if (["StripeInvalidRequestError", "StripeCardError"].includes(error.type)) {
      await sequelize.transaction(async (transaction) => {
        const current = await Refund.findByPk(refundId, { transaction, lock: transaction.LOCK.UPDATE });
        if (current && current.status !== "succeeded") {
          await current.update({ status: "manual_review", failure_reason: error.code || error.type }, { transaction });
          await RefundEvent.create({ refund_id: refundId, action: "manual_review", note: error.code || error.type }, { transaction });
        }
      });
      return;
    }
    throw error;
  }
  await applyProviderRefund(providerRefund, `worker:${providerRefund.id}:${providerRefund.status}:${refund.attempt}`);
  if (!["succeeded", "failed", "canceled"].includes(providerRefund.status))
    throw new Error("Refund is still processing");
}

/** Webhook chỉ là tín hiệu; lấy trạng thái hiện tại từ Stripe để chống sự kiện đến sai thứ tự. */
async function handleStripeEvent(event) {
  if (!["refund.created", "refund.updated", "refund.failed"].includes(event.type))
    return { ignored: true };
  const refundId = event.data?.object?.id;
  if (!refundId?.startsWith("re_")) return { ignored: true };
  const current = await getStripe().refunds.retrieve(refundId);
  return applyProviderRefund(current, event.id);
}

async function listForAdmin({ status = "all", page = 1, limit = 20 }) {
  const where = status === "all" ? {} : { status };
  const { rows, count } = await Refund.findAndCountAll({ where,
    include: [{ association: "booking", attributes: ["id", "reference_number", "check_in", "status"] },
      { association: "payment", attributes: ["id", "amount", "currency", "status"] }],
    order: [["created_at", "DESC"], ["id", "DESC"]], limit, offset: (page - 1) * limit,
    distinct: true });
  return { items: rows.map((row) => ({ ...row.toJSON(),
    booking_code: bookingCode(row.booking?.reference_number) })),
    meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) } };
}

async function detailForAdmin(refundId) {
  const refund = await Refund.findByPk(refundId, { include: [
    { association: "booking", attributes: ["id", "reference_number", "check_in", "status"] },
    { association: "payment", attributes: ["id", "amount", "currency", "status"] },
    { association: "cancellation" },
  ] });
  if (!refund) throw httpError(404, "Refund not found");
  const events = await RefundEvent.findAll({ where: { refund_id: refundId },
    order: [["created_at", "ASC"], ["id", "ASC"]] });
  return { ...refund.toJSON(), booking_code: bookingCode(refund.booking?.reference_number), events };
}

async function adminAction({ refundId, actorId, action, note }) {
  const snapshot = await Refund.findByPk(refundId);
  if (!snapshot) throw httpError(404, "Refund not found");
  if (action === "retry" && snapshot.stripe_refund_id) {
    const provider = await getStripe().refunds.retrieve(snapshot.stripe_refund_id);
    if (!["failed", "canceled"].includes(provider.status))
      throw httpError(409, "Stripe has not confirmed refund failure");
  }
  return sequelize.transaction(async (transaction) => {
    const { booking } = await bookingRepo.lockForMutation(snapshot.booking_id, transaction);
    const refund = await Refund.findByPk(refundId, { transaction, lock: transaction.LOCK.UPDATE });
    if (action === "retry") {
      if (refund.stripe_refund_id !== snapshot.stripe_refund_id)
        throw httpError(409, "Refund changed while checking Stripe");
      if (!["failed", "manual_review"].includes(refund.status))
        throw httpError(409, "Refund is not retryable");
      const confirmedFailed = Boolean(refund.stripe_refund_id);
      await refund.update({ status: "requested", admin_note: note, failure_reason: null,
        stripe_refund_id: null, attempt: refund.attempt + (confirmedFailed ? 1 : 0) }, { transaction });
      await enqueue("stripe_refund", { refundId: refund.id }, transaction);
    } else if (action === "review") {
      if (refund.status === "succeeded") throw httpError(409, "Succeeded refund cannot be reviewed");
      await refund.update({ status: "manual_review", admin_note: note }, { transaction });
    } else throw httpError(400, "Invalid refund action");
    await RefundEvent.create({ refund_id: refund.id, actor_id: actorId,
      action: action === "retry" ? "admin_retry" : "admin_review", note }, { transaction });
    return { refund, booking_id: booking.id };
  });
}

module.exports = { requestReconciliation, processRefund, applyProviderRefund,
  handleStripeEvent, listForAdmin, detailForAdmin, adminAction };
