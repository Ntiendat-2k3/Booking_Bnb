const test = require("node:test");
const assert = require("node:assert/strict");
const { database, loadBackend } = require("./helpers");

const listingId = "10000000-0000-4000-8000-000000000001";
const guestId = "10000000-0000-4000-8000-000000000002";
const hostId = "10000000-0000-4000-8000-000000000003";
const bookingId = "10000000-0000-4000-8000-000000000004";
const paymentId = "10000000-0000-4000-8000-000000000005";
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

function setup({ days = 2, bookingStatus = "confirmed", paymentStatus = "succeeded", policy = "moderate" } = {}) {
  const policies = loadBackend("services/cancellation_policy.js", {});
  const db = database({
    Listing: [{ id: listingId, host_id: hostId, title: "Căn hộ A", deleted_at: null,
      status: "published", price_per_night: "500000", max_guests: 2,
      cancellation_policy_code: "strict" }],
    Booking: [{ id: bookingId, listing_id: listingId, guest_id: guestId,
      status: bookingStatus, stay_status: "not_checked_in", reference_number: "1",
      check_in: day(days), check_out: day(days + 2), guests_count: 2,
      total_amount: "1000000", price_per_night_snapshot: "500000", currency: "VND",
      cancellation_policy_snapshot: policies.snapshot(policy),
      created_at: new Date(Date.now() - 3 * 86400000) }],
    Payment: [{ id: paymentId, booking_id: bookingId, provider: "stripe", status: paymentStatus,
      amount: "1000000", currency: "VND", provider_transaction_no: "pi_paid",
      provider_txn_ref: "pi_paid", payload: {} }],
    User: [{ id: guestId, email: "guest@example.com" }, { id: hostId, email: "host@example.com" }],
  });
  const bookingService = loadBackend("services/booking.service.js", db.models);
  const cancellation = loadBackend("services/cancellation.service.js", db.models);
  return { db, bookingService, cancellation };
}

test("Chính sách tính đúng ngày sát check-in, thời gian ân hạn và số tiền thực trả", () => {
  const policy = loadBackend("services/cancellation_policy.js", {});
  const now = new Date("2026-10-24T10:00:00Z");
  const input = { checkIn: "2026-10-26", bookedAt: "2026-10-20T00:00:00Z",
    paidAmount: "1000001", now };
  const moderate = policy.quote({ ...input, policy: policy.snapshot("moderate") });
  assert.equal(moderate.refund_amount, "500000");
  assert.equal(moderate.non_refundable_amount, "500001");
  assert.equal(policy.quote({ ...input, policy: policy.snapshot("strict") }).refund_amount, "0");
  assert.equal(policy.quote({ ...input, policy: policy.snapshot("flexible") }).refund_amount, "1000001");
  assert.equal(policy.quote({ ...input, bookedAt: "2026-10-24T09:00:00Z",
    checkIn: "2026-11-10", policy: policy.snapshot("strict") }).refund_amount, "1000001");
});

test("Booking lưu snapshot chính sách dù Host đổi chính sách phòng sau đó", async () => {
  const { db, bookingService } = setup({ paymentStatus: "pending", bookingStatus: "pending_payment" });
  db.rows("Booking")[0].check_in = "2099-01-01";
  db.rows("Booking")[0].check_out = "2099-01-03";
  await db.models.Listing.update({ cancellation_policy_code: "flexible" }, { where: { id: listingId } });
  const result = await bookingService.create({ userId: guestId, listingId,
    check_in: "2099-01-03", check_out: "2099-01-05", guests_count: 2 });
  assert.equal(result.booking.cancellation_policy_snapshot.code, "flexible");
  await db.models.Listing.update({ cancellation_policy_code: "strict" }, { where: { id: listingId } });
  assert.equal(db.rows("Booking").find((row) => row.id === result.booking.id).cancellation_policy_snapshot.code, "flexible");
});

test("Hủy đơn đã trả tạo đúng một refund 50%, giữ Payment đã thanh toán tới khi Stripe xác nhận", async () => {
  const { db, bookingService, cancellation } = setup();
  const preview = await cancellation.preview({ userId: guestId, bookingId });
  assert.equal(preview.refund_amount, "500000");
  await assert.rejects(cancellation.preview({ userId: hostId, bookingId }), { status: 404 });
  const first = await bookingService.cancel({ userId: guestId, bookingId, expectedRefundAmount: "500000" });
  const second = await bookingService.cancel({ userId: guestId, bookingId, expectedRefundAmount: "500000" });
  assert.equal(first.cancellation.id, second.cancellation.id);
  assert.equal(db.rows("Booking")[0].status, "cancelled");
  assert.equal(db.rows("BookingCancellation").length, 1);
  assert.equal(db.rows("Refund").length, 1);
  assert.equal(db.rows("Refund")[0].amount, "500000");
  assert.equal(db.rows("Refund")[0].status, "requested");
  assert.equal(db.rows("Payment")[0].status, "succeeded");
  assert.equal(db.rows("BackgroundJob").filter((job) => job.type === "stripe_refund").length, 1);
  assert.equal(db.rows("BackgroundJob").filter((job) => job.type === "send_email").length, 2);
});

test("Đơn chưa thanh toán hủy không tạo refund; báo giá đổi thì không hủy", async () => {
  const unpaid = setup({ bookingStatus: "pending_payment", paymentStatus: "pending" });
  await unpaid.bookingService.cancel({ userId: guestId, bookingId, expectedRefundAmount: 0,
    reason: "Tôi chọn nhầm ngày hoặc số khách" });
  assert.equal(unpaid.db.rows("Refund").length, 0);
  assert.equal(unpaid.db.rows("BookingCancellation")[0].paid_amount, "0");
  assert.equal(unpaid.db.rows("BookingCancellation")[0].reason, "Tôi chọn nhầm ngày hoặc số khách");
  assert.equal(unpaid.db.rows("Payment")[0].status, "cancelled");
  const paid = setup();
  await assert.rejects(paid.bookingService.cancel({ userId: guestId, bookingId,
    expectedRefundAmount: "1000000" }), { status: 409 });
  assert.equal(paid.db.rows("Booking")[0].status, "confirmed");
  assert.equal(paid.db.rows("Refund").length, 0);
});

test("Payment bất thường đã chờ đối soát không tạo thêm refund khi Guest hủy", async () => {
  const { db, bookingService, cancellation } = setup({ bookingStatus: "pending_payment" });
  db.rows("Payment")[0].payload = { refund_requested: "booking_changed" };
  const quote = await cancellation.preview({ userId: guestId, bookingId });
  assert.equal(quote.refund_amount, "0");
  await bookingService.cancel({ userId: guestId, bookingId, expectedRefundAmount: 0 });
  assert.equal(db.rows("Refund").length, 0);
});

test("Stripe xử lý hoàn một phần bất đồng bộ; webhook trễ lấy trạng thái hiện tại và không ghi trùng", async () => {
  const { db, bookingService } = setup();
  await bookingService.cancel({ userId: guestId, bookingId });
  const refundId = db.rows("Refund")[0].id;
  let current = { id: "re_partial", status: "pending", amount: 500000,
    currency: "vnd", payment_intent: "pi_paid", metadata: { refundId } };
  const calls = [];
  const stripe = { refunds: {
    create: async (input, options) => { calls.push({ input, options }); return current; },
    retrieve: async () => current,
  } };
  const service = loadBackend("services/refund.service.js", db.models,
    { "config/stripe.js": { getStripe: () => stripe } });
  await assert.rejects(service.processRefund(refundId), /still processing/);
  assert.equal(db.rows("Refund")[0].status, "processing");
  assert.equal(db.rows("Payment")[0].status, "succeeded");
  assert.equal(calls[0].input.amount, 500000);
  assert.equal(calls[0].options.idempotencyKey, `refund:${refundId}:1`);
  current = { ...current, status: "succeeded" };
  await service.handleStripeEvent({ id: "evt_success", type: "refund.updated", data: { object: current } });
  await service.handleStripeEvent({ id: "evt_late", type: "refund.updated", data: { object: { ...current, status: "pending" } } });
  assert.equal(db.rows("Refund")[0].status, "succeeded");
  assert.equal(db.rows("Payment")[0].status, "succeeded");
  assert.equal(db.rows("Notification").filter((row) => row.type === "refund_succeeded").length, 2);
});

test("Hoàn toàn phần chỉ đổi Payment khi Stripe xác nhận; thất bại muộn khôi phục trạng thái", async () => {
  const { db, bookingService } = setup({ days: 10 });
  await bookingService.cancel({ userId: guestId, bookingId });
  const refundId = db.rows("Refund")[0].id;
  let current = { id: "re_full", status: "succeeded", amount: 1000000,
    currency: "vnd", payment_intent: "pi_paid", metadata: { refundId } };
  const stripe = { refunds: { create: async () => current, retrieve: async () => current } };
  const service = loadBackend("services/refund.service.js", db.models,
    { "config/stripe.js": { getStripe: () => stripe } });
  assert.equal(db.rows("Payment")[0].status, "succeeded");
  await service.processRefund(refundId);
  assert.equal(db.rows("Payment")[0].status, "refunded");
  current = { ...current, status: "failed", failure_reason: "expired_or_canceled_card" };
  await service.handleStripeEvent({ id: "evt_failed", type: "refund.failed", data: { object: current } });
  assert.equal(db.rows("Refund")[0].status, "failed");
  assert.equal(db.rows("Payment")[0].status, "succeeded");
  assert.equal(db.rows("Notification").filter((row) => row.type === "refund_failed").length, 2);
});

test("Webhook hoàn tiền sai số tiền bị từ chối và Admin chỉ thử lại khi Stripe xác nhận thất bại", async () => {
  const { db, bookingService } = setup();
  await bookingService.cancel({ userId: guestId, bookingId });
  const refundId = db.rows("Refund")[0].id;
  const provider = { id: "re_wrong", status: "succeeded", amount: 1,
    currency: "vnd", payment_intent: "pi_paid", metadata: { refundId } };
  const stripe = { refunds: { retrieve: async () => provider } };
  const service = loadBackend("services/refund.service.js", db.models,
    { "config/stripe.js": { getStripe: () => stripe } });
  await assert.rejects(service.applyProviderRefund(provider, "evt_wrong"), { status: 409 });
  assert.equal(db.rows("Refund")[0].status, "requested");
  await db.models.Refund.update({ status: "failed", stripe_refund_id: "re_wrong" }, { where: { id: refundId } });
  await assert.rejects(service.adminAction({ refundId, actorId: hostId,
    action: "retry", note: "Kiểm tra lại khoản hoàn" }), { status: 409 });
  provider.status = "failed";
  await service.adminAction({ refundId, actorId: hostId, action: "retry", note: "Stripe đã xác nhận lỗi" });
  assert.equal(db.rows("Refund")[0].status, "requested");
  assert.equal(db.rows("Refund")[0].attempt, 2);
  assert.equal(db.rows("BackgroundJob").filter((job) => job.type === "stripe_refund").length, 2);
});

test("Tranh chấp Stripe đến sai thứ tự được đối chiếu theo trạng thái mới nhất; Admin ghi chú riêng", async () => {
  const { db } = setup();
  let current = { id: "du_real", amount: 1000000, currency: "vnd",
    payment_intent: "pi_paid", status: "needs_response", reason: "fraudulent",
    evidence_details: { due_by: 1793000000 } };
  const stripe = { disputes: { retrieve: async () => current } };
  const service = loadBackend("services/payment_dispute.service.js", db.models,
    { "config/stripe.js": { getStripe: () => stripe } });
  await service.handleStripeEvent({ type: "charge.dispute.created", data: { object: { id: "du_real" } } });
  assert.equal(db.rows("PaymentDispute").length, 1);
  current = { ...current, status: "won" };
  await service.handleStripeEvent({ type: "charge.dispute.updated", data: { object: { id: "du_real", status: "needs_response" } } });
  assert.equal(db.rows("PaymentDispute")[0].provider_status, "won");
  const disputeId = db.rows("PaymentDispute")[0].id;
  await service.addAdminNote({ id: disputeId, actorId: hostId, note: "Đã kiểm tra chứng từ" });
  assert.equal(db.rows("PaymentDispute")[0].admin_note, "Đã kiểm tra chứng từ");
  assert.equal(db.rows("PaymentDispute")[0].provider_status, "won");
  current = { ...current, payment_intent: "pi_unknown" };
  assert.equal((await service.handleStripeEvent({ type: "charge.dispute.closed",
    data: { object: { id: "du_real" } } })).ignored, true);
  assert.equal(db.rows("PaymentDispute").length, 1);
});
