"use strict";

/** Đồng bộ tranh chấp Stripe để Admin theo dõi, không tự thay đổi kết quả của nhà cung cấp. */
const { Payment, PaymentDispute, sequelize } = require("../models");
const { getStripe } = require("../config/stripe");
const httpError = require("../utils/httpError");
const { bookingCode } = require("../transformers/booking.transformer");

async function handleStripeEvent(event) {
  if (!["charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed"].includes(event.type))
    return { ignored: true };
  const disputeId = event.data?.object?.id;
  if (!disputeId?.startsWith("du_")) return { ignored: true };
  const stripe = getStripe();
  const dispute = await stripe.disputes.retrieve(disputeId);
  const intentId = typeof dispute.payment_intent === "string"
    ? dispute.payment_intent : dispute.payment_intent?.id;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  const resolvedIntentId = intentId || (chargeId &&
    (await stripe.charges.retrieve(chargeId)).payment_intent);
  if (!resolvedIntentId) return { ignored: true };
  const payment = await Payment.findOne({ where: { provider: "stripe",
    provider_transaction_no: resolvedIntentId } });
  if (!payment || String(dispute.currency).toUpperCase() !== payment.currency.toUpperCase() ||
    !Number.isSafeInteger(dispute.amount) || dispute.amount <= 0)
    return { ignored: true };
  return sequelize.transaction(async (transaction) => {
    const [record] = await PaymentDispute.findOrCreate({
      where: { stripe_dispute_id: disputeId },
      defaults: { booking_id: payment.booking_id, payment_id: payment.id,
        amount: String(dispute.amount), currency: payment.currency,
        provider_status: dispute.status, reason: dispute.reason || null }, transaction,
    });
    if (record.payment_id !== payment.id || String(record.amount) !== String(dispute.amount))
      throw httpError(409, "Dispute reference does not match payment");
    await record.update({ provider_status: dispute.status, reason: dispute.reason || null,
      evidence_due_at: dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000) : null }, { transaction });
    return { dispute: record };
  });
}

async function listForAdmin({ page = 1, limit = 20 }) {
  const { rows, count } = await PaymentDispute.findAndCountAll({
    include: [{ association: "booking", attributes: ["id", "reference_number", "status"] }],
    order: [["created_at", "DESC"], ["id", "DESC"]], limit, offset: (page - 1) * limit,
    distinct: true,
  });
  return { items: rows.map((row) => ({ ...row.toJSON(),
    booking_code: bookingCode(row.booking?.reference_number) })),
    meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) } };
}

async function detailForAdmin(id) {
  const row = await PaymentDispute.findByPk(id, { include: [
    { association: "booking", attributes: ["id", "reference_number", "status"] },
    { association: "payment", attributes: ["id", "amount", "currency", "status"] },
  ] });
  if (!row) throw httpError(404, "Dispute not found");
  return { ...row.toJSON(), booking_code: bookingCode(row.booking?.reference_number) };
}

async function addAdminNote({ id, actorId, note }) {
  const row = await PaymentDispute.findByPk(id);
  if (!row) throw httpError(404, "Dispute not found");
  await row.update({ admin_note: note, reviewed_by: actorId, reviewed_at: new Date() });
  return row;
}

module.exports = { handleStripeEvent, listForAdmin, detailForAdmin, addAdminNote };
