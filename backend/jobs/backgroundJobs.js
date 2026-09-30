// Worker nhận tác vụ bằng khóa SKIP LOCKED; mọi lời gọi dịch vụ ngoài chạy sau khi transaction nhận việc đã đóng.
const { Op } = require("sequelize");
const { BackgroundJob, Payment, UploadedAsset, sequelize } = require("../models");
const { sendEmail } = require("../utils/mailer");
const { destroy } = require("../services/cloudinary.service");
const { cleanupExpiredUploads } = require("../services/uploaded_asset.service");
const { getStripe } = require("../config/stripe");
const { randomUUID } = require("crypto");

async function execute(job) {
  const payload = job.payload;
  switch (job.type) {
    case "send_email":
      return sendEmail(payload.to, payload.subject, payload.html);
    case "cloudinary_delete":
      await destroy(payload.public_id, payload.resource_type);
      return UploadedAsset.destroy({ where: { public_id: payload.public_id } });
    case "stripe_expire_session": {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(payload.sessionId);
      if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
      return;
    }
    case "stripe_refund": {
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
  let stopped = false;
  const tick = () => {
    if (stopped || active) return;
    active = runNextJob().catch((error) => console.error("[jobs] Không thể nhận tác vụ:", error.name))
      .finally(() => { active = null; });
  };
  const timer = setInterval(tick, intervalMs);
  const cleanup = () => {
    if (stopped || activeCleanup) return;
    activeCleanup = cleanupExpiredUploads().catch((error) => console.error("[uploads] Dọn ảnh bỏ dở thất bại:", error.name))
      .finally(() => { activeCleanup = null; });
  };
  const cleanupTimer = setInterval(cleanup, 60 * 1000);
  timer.unref();
  cleanupTimer.unref();
  tick();
  cleanup();
  return async () => { stopped = true; clearInterval(timer); clearInterval(cleanupTimer); await Promise.allSettled([active, activeCleanup]); };
}

module.exports = { startBackgroundJobs, runNextJob };
