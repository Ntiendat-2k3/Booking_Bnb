"use strict";

/** Báo giá hủy và ghi yêu cầu hoàn tiền cùng giao dịch booking; Stripe được gọi bởi worker sau commit. */
const { Booking, BookingCancellation, Payment, Refund, RefundEvent, sequelize } = require("../models");
const { snapshot, quote } = require("./cancellation_policy");
const { enqueue } = require("./background_job.service");
const httpError = require("../utils/httpError");

function assertCancellable(booking) {
  if (!["pending_payment", "confirmed"].includes(booking.status))
    throw httpError(409, "Booking cannot be cancelled");
  if (booking.status === "confirmed" &&
    (booking.check_out <= new Date().toISOString().slice(0, 10) ||
      (booking.stay_status && booking.stay_status !== "not_checked_in")))
    throw httpError(409, "Stay has started or ended");
}

async function quoteForBooking(booking, transaction) {
  assertCancellable(booking);
  if (booking.payment_method === "property" && await Payment.findOne({ where: {
    booking_id: booking.id, provider: "property", status: "succeeded",
  }, transaction })) throw httpError(409, "Collected property payment requires manual cancellation review");
  const paidPayments = await Payment.findAll({
    where: { booking_id: booking.id, provider: "stripe", status: "succeeded" },
    order: [["created_at", "ASC"], ["id", "ASC"]], transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  // Giao dịch bất thường đã có yêu cầu đối soát riêng, không được hoàn lần thứ hai khi khách hủy.
  const payments = paidPayments.filter((payment) => !payment.payload?.refund_requested);
  const paid = payments.reduce((sum, payment) => sum + BigInt(payment.amount), 0n);
  const policy = booking.cancellation_policy_snapshot || snapshot("moderate");
  const result = quote({ policy, checkIn: booking.check_in,
    bookedAt: booking.created_at, paidAmount: paid.toString() });
  return { ...result, booking_id: booking.id, currency: booking.currency,
    payment_state: paid > 0n ? "paid" : "unpaid",
    processing_days_min: paid > 0n && BigInt(result.refund_amount) > 0n ? 5 : 0,
    processing_days_max: paid > 0n && BigInt(result.refund_amount) > 0n ? 10 : 0,
    payments };
}

async function preview({ userId, bookingId }) {
  const booking = await Booking.findOne({ where: { id: bookingId, guest_id: userId } });
  if (!booking) throw httpError(404, "Booking not found");
  const { payments, ...result } = await quoteForBooking(booking);
  return result;
}

/** Mỗi khoản đã thu có đúng một yêu cầu hoàn cho lần hủy; số tiền phân bổ không vượt khoản đã thu. */
async function record({ booking, userId, quoteResult, reason, transaction }) {
  const cancellation = await BookingCancellation.create({
    booking_id: booking.id, actor_id: userId, policy_snapshot: quoteResult.policy,
    paid_amount: quoteResult.paid_amount, refund_amount: quoteResult.refund_amount,
    non_refundable_amount: quoteResult.non_refundable_amount,
    currency: booking.currency, reason: reason || null,
  }, { transaction });
  let remaining = BigInt(quoteResult.refund_amount);
  for (const payment of quoteResult.payments) {
    if (remaining <= 0n) break;
    const amount = remaining < BigInt(payment.amount) ? remaining : BigInt(payment.amount);
    const refund = await Refund.create({
      booking_id: booking.id, payment_id: payment.id, cancellation_id: cancellation.id,
      source_key: `cancel:${booking.id}:${payment.id}`, amount: amount.toString(),
      currency: payment.currency, status: "requested", attempt: 1,
    }, { transaction });
    await RefundEvent.create({ refund_id: refund.id, actor_id: userId, action: "requested" }, { transaction });
    await enqueue("stripe_refund", { refundId: refund.id }, transaction);
    remaining -= amount;
  }
  if (remaining !== 0n) throw new Error("Refund exceeds paid amount");
  return cancellation;
}

async function history({ userId, bookingId }) {
  const booking = await Booking.findOne({ where: { id: bookingId, guest_id: userId }, attributes: ["id"] });
  if (!booking) throw httpError(404, "Booking not found");
  const cancellation = await BookingCancellation.findOne({ where: { booking_id: bookingId } });
  if (!cancellation) return null;
  const refunds = await Refund.findAll({ where: { cancellation_id: cancellation.id },
    attributes: ["id", "amount", "currency", "status", "failure_reason", "created_at", "updated_at"],
    order: [["created_at", "ASC"]] });
  return { ...cancellation.toJSON(), refunds };
}

module.exports = { assertCancellable, quoteForBooking, preview, record, history };
