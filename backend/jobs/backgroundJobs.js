// Worker nhận tác vụ bằng khóa SKIP LOCKED; mọi lời gọi dịch vụ ngoài chạy sau khi transaction nhận việc đã đóng.
const { Op } = require("sequelize");
const { BackgroundJob, Payment, UploadedAsset, sequelize } = require("../models");
const { sendEmail } = require("../utils/mailer");
const { destroy } = require("../services/cloudinary.service");
const { cleanupExpiredUploads } = require("../services/uploaded_asset.service");
const { getStripe } = require("../config/stripe");
const { randomUUID } = require("crypto");
const calls = require("../services/call.service");
const { createReminders } = require("../services/notification-reminder.service");

async function execute(job) {
  const payload = job.payload;
  switch (job.type) {
    case "send_email":
      return sendEmail(payload.to, payload.subject, payload.html);
    case "booking_confirmation":
      return require("../services/booking_qr.service").sendConfirmation(payload);
    case "promotion_notify":
      return require("../services/coupon.service").notifyEligible(payload.couponId);
    case "cloudinary_delete":
      await destroy(payload.public_id, payload.resource_type, payload.delivery_type || "upload");
      return UploadedAsset.destroy({ where: { public_id: payload.public_id } });
    case "stripe_expire_session": {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(payload.sessionId);
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
      else if (session.payment_status === "paid") await require("../services/payment.service").handleStripeWebhook({
        id: "reconcile:" + session.id, type: "checkout.session.completed", data: { object: session },
      });
      return;
    }
    case "stripe_cancel_intent": {
      const stripe = getStripe();
      const intent = await stripe.paymentIntents.retrieve(payload.intentId);
      if (["requires_payment_method", "requires_confirmation", "requires_action", "requires_capture"].includes(intent.status)) {
        await stripe.paymentIntents.cancel(intent.id);
      }
      else if (intent.status === "succeeded") await require("../services/payment.service").handleStripeWebhook({
        id: "reconcile:" + intent.id, type: "payment_intent.succeeded", data: { object: intent },
      });
      return;
    }
    case "stripe_refund": {
      if (payload.refundId)
        return require("../services/refund.service").processRefund(payload.refundId);
      const payment = await Payment.findByPk(payload.paymentId);
      if (!payment || payment.status === "refunded") return;
      const stripe = getStripe();
      const refund = payment.payload?.refund?.id
        ? await stripe.refunds.retrieve(payment.payload.refund.id)
        : await stripe.refunds.create({ payment_intent: payload.paymentIntent }, { idempotencyKey: `refund:${payment.id}` });
      await payment.update({
        payload: { ...payment.payload, refund: { id: refund.id, status: refund.status } },
        ...(refund.status === "succeeded" ? { status: "refunded" } : {}),
      });
      if (refund.status !== "succeeded") throw new Error("Refund has not succeeded");
      return;
    }
    default:
      throw new Error(`Unsupported job type: ${job.type}`);
  }
}

/** Lease 5 phút cho phép nhận lại việc khi worker chết; token ngăn worker cũ ghi đè kết quả của lượt nhận mới. */
async function runNextJob() {
  const leaseToken = randomUUID();
  const job = await sequelize.transaction(async (transaction) => {
    const row = await BackgroundJob.findOne({
      where: {
        [Op.or]: [
          { status: "pending", available_at: { [Op.lte]: new Date() } },
          { status: "running", locked_at: { [Op.lt]: new Date(Date.now() - 5 * 60000) } },
        ],
      },
      order: [["available_at", "ASC"]], transaction, lock: transaction.LOCK.UPDATE, skipLocked: true,
    });
    if (!row) return null;
    await row.update({ status: "running", locked_at: new Date(), attempts: row.attempts + 1, lock_token: leaseToken }, { transaction });
    return row;
  });
  if (!job) return false;
  try {
    await execute(job);
    await BackgroundJob.update({ status: "completed", locked_at: null, lock_token: null, last_error: null, payload: {} }, {
      where: { id: job.id, status: "running", lock_token: leaseToken },
    });
  } catch (error) {
    console.error("[jobs] Tác vụ thất bại:", job.id, job.type);
    await BackgroundJob.update({
      status: "pending", locked_at: null, lock_token: null,
      available_at: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(job.attempts, 7))),
      last_error: "External task failed",
    }, { where: { id: job.id, status: "running", lock_token: leaseToken } });
  }
  return true;
}

function startBackgroundJobs(intervalMs = 1000) {
  let active;
  let activeCleanup;
  let activeCalls;
  let activeReminders;
  let stopped = false;
  const tick = () => {
    if (stopped || active) return;
    active = runNextJob().catch((error) => console.error("[jobs] Không thể nhận tác vụ:", {
      name: error.name, code: error.parent?.code || error.code, message: error.parent?.message || error.message,
    }))
      .finally(() => { active = null; });
  };
  const timer = setInterval(tick, intervalMs);
  const cleanup = () => {
    if (stopped || activeCleanup) return;
    activeCleanup = cleanupExpiredUploads().catch((error) => console.error("[uploads] Dọn ảnh bỏ dở thất bại:", {
      name: error.name, code: error.parent?.code || error.code, message: error.parent?.message || error.message,
    }))
      .finally(() => { activeCleanup = null; });
  };
  const cleanupTimer = setInterval(cleanup, 60 * 1000);
  const reconcileCalls = () => {
    if (stopped || activeCalls) return;
    activeCalls = calls.reconcileExpired().catch((error) => console.error("[calls] Không thể dọn cuộc gọi quá hạn:", {
      name: error.name, code: error.parent?.code || error.code,
    })).finally(() => { activeCalls = null; });
  };
  const callTimer = setInterval(reconcileCalls, 5000);
  const remind = () => {
    if (stopped || activeReminders) return;
    activeReminders = createReminders().catch((error) => console.error("[notifications] Không thể tạo nhắc lịch:", {
      name: error.name, code: error.parent?.code || error.code,
    })).finally(() => { activeReminders = null; });
  };
  const reminderTimer = setInterval(remind, 15 * 60 * 1000);
  timer.unref();
  cleanupTimer.unref();
  callTimer.unref();
  reminderTimer.unref();
  tick();
  cleanup();
  reconcileCalls();
  remind();
  return async () => { stopped = true; clearInterval(timer); clearInterval(cleanupTimer);
    clearInterval(callTimer); clearInterval(reminderTimer);
    await Promise.allSettled([active, activeCleanup, activeCalls, activeReminders]); };
}

module.exports = { startBackgroundJobs, runNextJob };
