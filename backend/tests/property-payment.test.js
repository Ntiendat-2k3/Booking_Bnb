const test = require("node:test");
const assert = require("node:assert/strict");
const { database, loadBackend } = require("./helpers");
const { collect: collectSchema } = require("../requests/api/v1/property-payment.schema");

const listingId = "10000000-0000-4000-8000-000000000001";
const guestId = "10000000-0000-4000-8000-000000000002";
const hostId = "10000000-0000-4000-8000-000000000003";
const bookingId = "10000000-0000-4000-8000-000000000004";
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

function setup(patch = {}) {
  const db = database({
    Listing: [{ id: listingId, host_id: hostId, status: "published", deleted_at: null,
      allow_pay_at_property: true, title: "Phòng A", city: "Hà Nội" }],
    Booking: [{ id: bookingId, listing_id: listingId, guest_id: guestId, status: "pending_payment",
      stay_status: "not_checked_in", reference_number: "1", check_in: day(-1), check_out: day(2),
      created_at: new Date(), total_amount: "200000", currency: "VND", ...patch }],
    Payment: [{ id: "stripe-1", booking_id: bookingId, provider: "stripe", status: "pending",
      provider_txn_ref: "pi_test", amount: "200000", currency: "VND" }],
    User: [{ id: guestId, email: "guest@example.com" }, { id: hostId, email: "host@example.com" }],
  });
  const createPayment = db.models.Payment.create;
  db.models.Payment.create = (data, options) =>
    createPayment({ reference_number: "2", ...data }, options);
  const overrides = {
    "services/host_listing.service.js": {
      async getByIdForUser(user, id, options) {
        const listing = await db.models.Listing.findByPk(id, options);
        if (!listing || (user.id !== listing.host_id && user.role !== "admin"))
          throw Object.assign(new Error("Forbidden"), { status: 403 });
        return { listing };
      },
    },
    "services/notification.service.js": {
      publishBookingChanged() {}, async recordBookingUpdate() {}, async recordStayUpdate() {},
    },
    "services/coupon.service.js": { async confirmForBooking() {} },
  };
  return { db, service: loadBackend("services/property_payment.service.js", db.models, overrides), overrides };
}

test("Mọi phòng đang đăng đều cho trả tại nơi ở; Stripe pending bị hủy", async () => {
  const { db, service } = setup();
  const result = await service.confirm({ bookingId, userId: guestId });
  assert.equal(result.booking.status, "confirmed");
  assert.equal(result.booking.payment_method, "property");
  assert.equal(result.payment.status, "pending");
  assert.equal(db.rows("Payment").find((item) => item.provider === "stripe").status, "cancelled");
  assert.equal(db.rows("BookingStayToken").length, 1);
  assert.equal(db.rows("BookingStayToken")[0].purpose, "verify");
  assert.deepEqual(db.rows("BackgroundJob").map((job) => job.type).sort(),
    ["booking_confirmation", "send_email", "stripe_cancel_intent"].sort());
  await assert.rejects(service.confirm({ bookingId, userId: guestId }), { status: 409 });

  const disabled = setup();
  await disabled.db.models.Listing.update({ allow_pay_at_property: false }, { where: { id: listingId } });
  const direct = await disabled.service.confirm({ bookingId, userId: guestId });
  assert.equal(direct.booking.payment_method, "property");
  const unpublished = setup();
  await unpublished.db.models.Listing.update({ status: "draft" }, { where: { id: listingId } });
  await assert.rejects(unpublished.service.confirm({ bookingId, userId: guestId }), { status: 409 });
});

test("Host thu tiền một lần; check-in chỉ thành công sau khi thu và Admin đối soát", async () => {
  const { db, service, overrides } = setup();
  await service.confirm({ bookingId, userId: guestId });
  const stay = loadBackend("services/booking_stay.service.js", db.models, overrides);
  assert.ok(collectSchema.validate({ listing_id: listingId, method: "cash" }).error);
  assert.ok(collectSchema.validate({ listing_id: listingId, method: "cash", amount: "200000" }).value);
  assert.ok(collectSchema.validate({ listing_id: listingId, method: "cash", amount: "0" }).error);
  assert.ok(collectSchema.validate({ listing_id: listingId, method: "cash", amount: "200000",
    external_ref: "CUSTOM-REFERENCE" }).error);
  await assert.rejects(service.collect({ user: { id: "other", role: "host" }, listingId, bookingId,
    method: "cash", amount: "200000" }), { status: 403 });
  await assert.rejects(stay.manual({ user: { id: hostId, role: "host" }, listingId, bookingId,
    purpose: "check_in", reason: "Khách không quét được QR" }), { status: 409 });
  const collected = await service.collect({ user: { id: hostId, role: "host" }, listingId, bookingId,
    method: "cash", amount: "180000" });
  assert.equal(collected.payment_status, "paid");
  assert.equal(db.rows("PaymentCollection")[0].collected_by, hostId);
  assert.equal(db.rows("PaymentCollection")[0].amount, "180000");
  assert.equal(db.rows("PaymentCollection")[0].external_ref, "TXN-00000002");
  assert.equal(db.rows("Payment").find((item) => item.provider === "property").status, "succeeded");
  assert.equal(db.rows("Payment").find((item) => item.provider === "property").amount, "180000");
  assert.equal(db.rows("Payment").find((item) => item.provider === "property").provider_transaction_no, undefined);
  const cancellations = loadBackend("services/cancellation.service.js", db.models);
  await assert.rejects(cancellations.quoteForBooking(await db.models.Booking.findByPk(bookingId)), { status: 409 });
  await assert.rejects(service.collect({ user: { id: hostId, role: "host" }, listingId, bookingId,
    method: "cash", amount: "200000" }), { status: 409 });
  const checkedIn = await stay.manual({ user: { id: hostId, role: "host" }, listingId, bookingId,
    purpose: "check_in", reason: "Khách không quét được QR" });
  assert.equal(checkedIn.stay_status, "checked_in");
  const report = await service.report({ user: { id: hostId, role: "host" }, listingId });
  assert.equal(report.totals.awaiting_reconciliation, "180000");
  assert.equal(report.items[0].collection.external_ref, "TXN-00000002");
  await assert.rejects(service.reconcile({ user: { id: hostId, role: "host" },
    collectionId: collected.collection.id }), { status: 403 });
  await service.reconcile({ user: { id: "admin-1", role: "admin" }, collectionId: collected.collection.id });
  assert.ok(db.rows("PaymentCollection")[0].reconciled_at);
});

test("Chuyển khoản cũng tự dùng mã thu tiền của hệ thống", async () => {
  const { db, service } = setup();
  await service.confirm({ bookingId, userId: guestId });
  const result = await service.collect({ user: { id: hostId, role: "host" }, listingId, bookingId,
    method: "bank_transfer", amount: "200000" });
  assert.equal(result.collection.external_ref, "TXN-00000002");
  assert.equal(db.rows("PaymentCollection")[0].method, "bank_transfer");
});

test("No-show chỉ áp dụng cho booking trả tại nơi ở chưa thu và thu hồi QR", async () => {
  const { db, service } = setup();
  await service.confirm({ bookingId, userId: guestId });
  const result = await service.noShow({ user: { id: hostId, role: "host" }, listingId,
    bookingId, reason: "Khách không đến sau ngày nhận phòng" });
  assert.equal(result.stay_status, "no_show");
  assert.equal(db.rows("Booking")[0].status, "cancelled");
  assert.equal(db.rows("Payment").find((item) => item.provider === "property").status, "cancelled");
  assert.ok(db.rows("BookingStayToken")[0].revoked_at);
  assert.equal(db.rows("BookingStayEvent")[0].action, "no_show");
});

test("Job email dựng QR sau commit, không lưu token thô và bỏ qua đơn đã hủy", async () => {
  const { db, service, overrides } = setup();
  await service.confirm({ bookingId, userId: guestId });
  const sent = [];
  const qr = loadBackend("services/booking_qr.service.js", db.models, {
    ...overrides, "utils/mailer.js": { sendEmail: async (...args) => sent.push(args) },
  });
  const job = db.rows("BackgroundJob").find((item) => item.type === "booking_confirmation");
  const raw = await qr.getForGuest({ guestId, bookingId });
  assert.equal(JSON.stringify(job.payload).includes(raw.token), false);
  await qr.sendConfirmation(job.payload);
  assert.equal(sent.length, 1);
  assert.match(sent[0][2], /data:image\/png;base64,/);
  assert.match(sent[0][2], /Chưa thanh toán/);
  assert.match(sent[0][3].smtpHtml, /src="cid:booking-qr-/);
  assert.ok(Buffer.isBuffer(sent[0][3].attachments[0].content));
  await db.models.Booking.update({ status: "cancelled" }, { where: { id: bookingId } });
  await qr.sendConfirmation(job.payload);
  assert.equal(sent.length, 1);
});

test("Đổi QR thu hồi mã email cũ và chặn gửi lại liên tiếp", async () => {
  const { db, service, overrides } = setup();
  await service.confirm({ bookingId, userId: guestId });
  const qr = loadBackend("services/booking_qr.service.js", db.models, overrides);
  const stay = loadBackend("services/booking_stay.service.js", db.models, overrides);
  const old = await qr.getForGuest({ guestId, bookingId });
  await assert.rejects(qr.resend({ guestId, bookingId }), { status: 429 });
  const fresh = await qr.rotate({ guestId, bookingId });
  assert.notEqual(fresh.token, old.token);
  await assert.rejects(stay.inspectQr({ user: { id: hostId, role: "host" }, listingId,
    rawToken: old.token }), { status: 410 });
  const preview = await stay.inspectQr({ user: { id: hostId, role: "host" }, listingId,
    rawToken: fresh.token });
  assert.equal(preview.purpose, "check_in");
  assert.equal(preview.booking.payment_status, "unpaid");
});
