const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Writable } = require("node:stream");
const { loadBackend, database } = require("./helpers");

const listingId = "10000000-0000-4000-8000-000000000001";
const guestId = "10000000-0000-4000-8000-000000000002";
const hostId = "10000000-0000-4000-8000-000000000003";
const bookingId = "10000000-0000-4000-8000-000000000004";
const paymentId = "10000000-0000-4000-8000-000000000005";
const listing = { id: listingId, host_id: hostId, status: "published", deleted_at: null, title: "Chỗ nghỉ <script>", max_guests: 4, price_per_night: "100000" };
const booking = { id: bookingId, listing_id: listingId, guest_id: guestId, status: "pending_payment", created_at: new Date(), check_in: "2099-01-01", check_out: "2099-01-03", guests_count: 2, total_amount: "200000", price_per_night_snapshot: "100000", currency: "VND" };
const payment = { id: paymentId, booking_id: bookingId, provider: "stripe", status: "pending", provider_txn_ref: "cs_test", amount: "200000", currency: "VND", payload: {} };
const people = [{ id: guestId, email: "guest@example.com", status: "active", provider: "local" }, { id: hostId, email: "host@example.com", status: "active" }];
const cacheOverride = { "core/cache.js": { invalidateListings: async () => {} } };
function fixture(overrides = {}) {
  return database({ Listing: [listing], Booking: [booking], Payment: [payment], User: people, ...overrides });
}
function paidEvent(patch = {}) {
  return { id: "evt_test", type: "checkout.session.completed", data: { object: { id: "cs_test", client_reference_id: paymentId, payment_status: "paid", payment_intent: "pi_test", amount_total: 200000, currency: "vnd", ...patch } } };
}

test("Hai request cùng lịch chỉ tạo một booking; ngày trả phòng cũ không được nhận khách mới", async () => {
  const db = fixture({ Booking: [], Payment: [] });
  const service = loadBackend("services/booking.service.js", db.models);
  const input = { userId: guestId, listingId, check_in: "2099-01-01", check_out: "2099-01-03", guests_count: 2 };
  const results = await Promise.allSettled([service.create(input), service.create(input)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
  assert.equal(db.rows("Booking").length, 1);
  await assert.rejects(service.create({ ...input, check_in: "2099-01-03",
    check_out: "2099-01-04" }), { status: 409 });
  await service.create({ ...input, check_in: "2099-01-04", check_out: "2099-01-05" });
  assert.equal(db.rows("Booking").length, 2);
});

test("Đặt phòng lưu tên và số điện thoại tại thời điểm đăng ký", async () => {
  const db = fixture({ Booking: [], Payment: [], User: [
    { ...people[0], full_name: "Tên khi đặt", phone: "0912345678" }, people[1],
  ] });
  const service = loadBackend("services/booking.service.js", db.models);
  await service.create({ userId: guestId, listingId,
    check_in: "2099-01-01", check_out: "2099-01-03", guests_count: 2 });
  assert.equal(db.rows("Booking")[0].renter_name, "Tên khi đặt");
  assert.equal(db.rows("Booking")[0].renter_phone, "0912345678");
});

test("Hold hết hạn không khóa lịch và checkout trước ngày trả phòng bị từ chối", async () => {
  const db = fixture({ Booking: [{ ...booking, created_at: new Date(Date.now() - 3600000) }] });
  const service = loadBackend("services/booking.service.js", db.models);
  await service.create({ userId: guestId, listingId, check_in: booking.check_in, check_out: booking.check_out });
  await db.models.Booking.update({ status: "confirmed" }, { where: { id: bookingId } });
  await assert.rejects(service.checkout({ userId: guestId, bookingId }), { status: 400 });
});

test("Sửa booking vô hiệu payment cũ, tạo tác vụ expire và không tự xung đột lịch", async () => {
  const db = fixture();
  const service = loadBackend("services/booking.service.js", db.models);
  await service.update({ userId: guestId, bookingId, check_out: "2099-01-04" });
  assert.equal(db.rows("Booking")[0].total_amount, "300000");
  assert.equal(db.rows("Payment")[0].status, "cancelled");
  assert.equal(db.rows("BackgroundJob")[0].type, "stripe_expire_session");
});

test("Webhook hợp lệ xác nhận một lần và escape nội dung email", async () => {
  const db = fixture();
  const service = loadBackend("services/payment.service.js", db.models);
  await Promise.all([service.handleStripeWebhook(paidEvent()), service.handleStripeWebhook(paidEvent())]);
  assert.equal(db.rows("Booking")[0].status, "confirmed");
  assert.equal(db.rows("Payment")[0].status, "succeeded");
  assert.equal(db.rows("Notification").length, 2);
  assert.equal(db.rows("BackgroundJob").length, 2);
  assert.ok(db.rows("BackgroundJob").some((job) => job.type === "booking_confirmation"));
  assert.ok(db.rows("BackgroundJob").find((job) => job.type === "send_email").payload.html.includes("&lt;script&gt;"));
});

for (const [name, bookingPatch, eventPatch] of [
  ["booking đã hủy", { status: "cancelled" }, {}],
  ["booking hết hold", { created_at: new Date(Date.now() - 3600000) }, {}],
  ["giá booking đã thay đổi", { total_amount: "300000" }, {}],
  ["số tiền webhook sai", {}, { amount_total: 1 }],
]) {
  test(`Webhook cho ${name} không xác nhận booking và chỉ enqueue một refund`, async () => {
    const db = fixture({ Booking: [{ ...booking, ...bookingPatch }] });
    const service = loadBackend("services/payment.service.js", db.models);
    await service.handleStripeWebhook(paidEvent(eventPatch));
    await service.handleStripeWebhook(paidEvent(eventPatch));
    assert.equal(db.rows("Booking")[0].status, bookingPatch.status || booking.status);
    assert.equal(db.rows("BackgroundJob").length, 1);
    assert.equal(db.rows("BackgroundJob")[0].type, "stripe_refund");
    assert.equal(db.rows("Notification").length, 0);
  });
}

test("DB lỗi sau cập nhật payment rollback toàn bộ; retry webhook phục hồi được", async () => {
  const db = fixture();
  const service = loadBackend("services/payment.service.js", db.models);
  db.failNextWrite("Notification");
  await assert.rejects(service.handleStripeWebhook(paidEvent()));
  assert.equal(db.rows("Booking")[0].status, "pending_payment");
  assert.equal(db.rows("Payment")[0].status, "pending");
  assert.equal(db.rows("BackgroundJob").length, 0);
  await service.handleStripeWebhook(paidEvent());
  assert.equal(db.rows("Booking")[0].status, "confirmed");
});

test("Webhook sửa được dữ liệu cũ payment succeeded nhưng booking còn pending", async () => {
  const db = fixture({ Payment: [{ ...payment, status: "succeeded" }] });
  await loadBackend("services/payment.service.js", db.models).handleStripeWebhook(paidEvent());
  assert.equal(db.rows("Booking")[0].status, "confirmed");
});

test("Webhook lặp sau khi hủy booking đã thanh toán không tự đổi chính sách hoàn tiền", async () => {
  const db = fixture({ Payment: [{ ...payment, status: "succeeded" }], Booking: [{ ...booking, status: "cancelled" }] });
  await loadBackend("services/payment.service.js", db.models).handleStripeWebhook(paidEvent());
  assert.equal(db.rows("BackgroundJob").length, 0);
  assert.equal(db.rows("Booking")[0].status, "cancelled");
});

test("Session không khớp bị từ chối mà không ghi dữ liệu", async () => {
  const db = fixture();
  await assert.rejects(loadBackend("services/payment.service.js", db.models).handleStripeWebhook(paidEvent({ id: "cs_other" })), { status: 400 });
  assert.equal(db.rows("Payment")[0].status, "pending");
});

test("Checkout đồng thời dùng chung idempotency key; Stripe được gọi sau commit", async () => {
  const db = fixture({ Payment: [] });
  const keys = [];
  const stripe = { paymentIntents: { create: async (_input, options) => {
    assert.equal(db.rows("Payment").length, 1);
    keys.push(options.idempotencyKey);
    return { id: "pi_test", client_secret: "pi_test_secret", amount: 200000, currency: "vnd", status: "requires_payment_method" };
  } } };
  const service = loadBackend("services/payment.service.js", db.models, { "config/stripe.js": { getStripe: () => stripe } });
  await Promise.all([service.createStripePayment({ userId: guestId, bookingId }), service.createStripePayment({ userId: guestId, bookingId })]);
  assert.equal(db.rows("Payment").length, 1);
  assert.equal(new Set(keys).size, 1);
});

test("Stripe mất kết nối trả 503 và lần thử lại dùng đúng payment đang chờ", async () => {
  const db = fixture({ Payment: [] });
  const keys = [];
  const stripe = { paymentIntents: { create: async (_input, options) => {
    keys.push(options.idempotencyKey);
    if (keys.length === 1) throw { type: "StripeConnectionError" };
    return { id: "pi_retry", client_secret: "pi_retry_secret", amount: 200000, currency: "vnd", status: "requires_payment_method" };
  } } };
  const service = loadBackend("services/payment.service.js", db.models, { "config/stripe.js": { getStripe: () => stripe } });
  await assert.rejects(service.createStripePayment({ userId: guestId, bookingId }), { status: 503 });
  assert.equal(db.rows("Payment").length, 1);
  assert.equal(db.rows("Payment")[0].status, "pending");
  const result = await service.createStripePayment({ userId: guestId, bookingId });
  assert.equal(result.client_secret, "pi_retry_secret");
  assert.deepEqual(keys, [`intent:${result.payment.id}`, `intent:${result.payment.id}`]);
});

test("Phiên Checkout cũ được đóng trước khi tạo PaymentIntent mới", async () => {
  const db = fixture();
  const stripe = { paymentIntents: { create: async () => ({
    id: "pi_new", client_secret: "pi_new_secret", amount: 200000,
    currency: "vnd", status: "requires_payment_method",
  }) } };
  const service = loadBackend("services/payment.service.js", db.models, {
    "config/stripe.js": { getStripe: () => stripe },
  });
  const result = await service.createStripePayment({ userId: guestId, bookingId });
  assert.equal(result.client_secret, "pi_new_secret");
  assert.equal(db.rows("Payment").length, 2);
  assert.equal(db.rows("Payment").find((row) => row.id === paymentId).status, "cancelled");
  assert.equal(db.rows("BackgroundJob")[0].type, "stripe_expire_session");
});

test("Sửa đơn hủy PaymentIntent đang chờ", async () => {
  const db = fixture({ Payment: [{ ...payment, provider_txn_ref: "pi_test", payload: { intent: { id: "pi_test" } } }] });
  const service = loadBackend("services/booking.service.js", db.models, {
    "services/notification-preference.service.js": { allows: async () => false },
  });
  await service.update({ userId: guestId, bookingId, check_out: "2099-01-04" });
  assert.equal(db.rows("Payment")[0].status, "cancelled");
  assert.equal(db.rows("BackgroundJob")[0].type, "stripe_cancel_intent");
});

test("Webhook PaymentIntent xác nhận đúng đơn và không xác nhận lặp", async () => {
  const db = fixture({ Payment: [{ ...payment, provider_txn_ref: "pi_test" }] });
  const service = loadBackend("services/payment.service.js", db.models, {
    "services/notification-preference.service.js": { allows: async () => true },
  });
  const event = { id: "evt_intent", type: "payment_intent.succeeded", data: { object: {
    id: "pi_test", status: "succeeded", metadata: { paymentId, bookingId },
    amount_received: 200000, currency: "vnd",
  } } };
  await service.handleStripeWebhook(event);
  await service.handleStripeWebhook(event);
  assert.equal(db.rows("Booking")[0].status, "confirmed");
  assert.equal(db.rows("Payment")[0].status, "succeeded");
  assert.equal(db.rows("Payment")[0].provider_transaction_no, "pi_test");
  assert.equal(db.rows("BackgroundJob").filter((job) => job.type === "stripe_refund").length, 0);
});

test("PaymentIntent đã hủy nhưng thanh toán thành công phải hoàn tiền, không xác nhận đơn", async () => {
  const db = fixture({ Payment: [{ ...payment, provider_txn_ref: "pi_test", status: "cancelled" }] });
  const service = loadBackend("services/payment.service.js", db.models);
  await service.handleStripeWebhook({ id: "evt_cancelled", type: "payment_intent.succeeded", data: { object: {
    id: "pi_test", status: "succeeded", metadata: { paymentId, bookingId },
    amount_received: 200000, currency: "vnd",
  } } });
  assert.equal(db.rows("Booking")[0].status, "pending_payment");
  assert.equal(db.rows("BackgroundJob")[0].type, "stripe_refund");
});

test("Đối soát Stripe chỉ cho khách của đơn và xác nhận theo dữ liệu Stripe", async () => {
  const db = fixture({ Payment: [{ ...payment, provider_txn_ref: "pi_test" }] });
  let retrieved = 0;
  const intent = { id: "pi_test", status: "succeeded", metadata: { paymentId, bookingId },
    amount_received: 200000, currency: "vnd" };
  const service = loadBackend("services/payment.service.js", db.models, {
    "config/stripe.js": { getStripe: () => ({ paymentIntents: { retrieve: async () => { retrieved++; return intent; } } }) },
    "services/notification-preference.service.js": { allows: async () => true },
  });
  await assert.rejects(service.reconcileStripePayment({ bookingId, userId: hostId }), { status: 404 });
  assert.equal(retrieved, 0);
  const result = await service.reconcileStripePayment({ bookingId, userId: guestId });
  assert.equal(result.booking_status, "confirmed");
  assert.equal(db.rows("Payment")[0].status, "succeeded");
  assert.equal(retrieved, 1);
});

test("Worker đối soát PaymentIntent đã thanh toán trong lúc yêu cầu hủy", async () => {
  const db = fixture({ BackgroundJob: [{
    id: "10000000-0000-4000-8000-000000000099", type: "stripe_cancel_intent",
    payload: { intentId: "pi_test" }, status: "pending", attempts: 0, available_at: new Date(),
  }] });
  const events = [];
  const jobs = loadBackend("jobs/backgroundJobs.js", db.models, {
    "config/stripe.js": { getStripe: () => ({ paymentIntents: { retrieve: async () => ({
      id: "pi_test", status: "succeeded", metadata: { paymentId, bookingId },
      amount_received: 200000, currency: "vnd",
    }) } }) },
    "services/payment.service.js": { handleStripeWebhook: async (event) => events.push(event) },
  });
  await jobs.runNextJob();
  assert.equal(events[0].type, "payment_intent.succeeded");
  assert.equal(db.rows("BackgroundJob")[0].status, "completed");
});

test("Ảnh upload của user khác hoặc đang chờ xóa không thể attach", async () => {
  for (const assetPatch of [{ user_id: guestId }, { user_id: hostId, delete_requested: true }, { user_id: hostId, listing_id: guestId }]) {
    const db = fixture({ Listing: [{ ...listing, status: "draft" }], UploadedAsset: [{ public_id: "owned", metadata: { url: "https://trusted" }, ...assetPatch }] });
    const service = loadBackend("services/host_listing_image.service.js", db.models, { "services/cloudinary.service.js": {} });
    await assert.rejects(service.attach({ id: hostId, role: "host" }, listingId, { public_id: "owned" }), { status: 403 });
    assert.equal(db.rows("ListingImage").length, 0);
  }
});

test("Upload giữ chỗ trước Cloudinary, gắn ảnh thành công và xóa tệp tạm", async () => {
  const db = fixture({ Listing: [{ ...listing, status: "draft" }] });
  const filePath = path.join(os.tmpdir(), `booking-upload-${Date.now()}`);
  await fs.writeFile(filePath, "image");
  let uploaded = 0;
  const service = loadBackend("services/host_listing_image.service.js", db.models, {
    "services/cloudinary.service.js": { uploadFile: async (_file, publicId) => {
      uploaded++;
      assert.equal(db.rows("UploadedAsset")[0].public_id, publicId);
      return { public_id: publicId, secure_url: "https://trusted/image.jpg", width: 800, height: 600, bytes: 100, format: "jpg", resource_type: "image" };
    } },
  });
  const result = await service.upload({ id: hostId, role: "host" }, { path: filePath }, listingId);
  assert.equal(uploaded, 1);
  await assert.rejects(fs.stat(filePath), { code: "ENOENT" });
  const attached = await service.attach({ id: hostId, role: "host" }, listingId, { public_id: result.public_id });
  assert.equal(attached.image.url, "https://trusted/image.jpg");
  assert.ok(db.rows("UploadedAsset")[0].attached_at);
});

test("Upload lỗi vẫn lên lịch xóa Cloudinary và không giữ tệp tạm", async () => {
  const db = fixture({ Listing: [{ ...listing, status: "draft" }] });
  const filePath = path.join(os.tmpdir(), `booking-upload-error-${Date.now()}`);
  await fs.writeFile(filePath, "image");
  const service = loadBackend("services/host_listing_image.service.js", db.models, {
    "services/cloudinary.service.js": { uploadFile: async () => { throw new Error("Cloudinary unavailable"); } },
  });
  await assert.rejects(service.upload({ id: hostId, role: "host" }, { path: filePath }, listingId), /Cloudinary unavailable/);
  assert.equal(db.rows("UploadedAsset")[0].delete_requested, true);
  assert.equal(db.rows("BackgroundJob")[0].type, "cloudinary_delete");
  await assert.rejects(fs.stat(filePath), { code: "ENOENT" });
});

test("Cloudinary thành công nhưng ghi metadata lỗi vẫn có ID để xóa", async () => {
  const db = fixture({ Listing: [{ ...listing, status: "draft" }] });
  const filePath = path.join(os.tmpdir(), `booking-upload-db-error-${Date.now()}`);
  await fs.writeFile(filePath, "image");
  const service = loadBackend("services/host_listing_image.service.js", db.models, {
    "services/cloudinary.service.js": { uploadFile: async (_file, publicId) => {
      db.failNextWrite("UploadedAsset");
      return { public_id: publicId, secure_url: "https://trusted/image.jpg", resource_type: "image" };
    } },
  });
  await assert.rejects(service.upload({ id: hostId, role: "host" }, { path: filePath }, listingId));
  assert.equal(db.rows("UploadedAsset")[0].delete_requested, true);
  assert.equal(db.rows("BackgroundJob")[0].payload.public_id, db.rows("UploadedAsset")[0].public_id);
  await assert.rejects(fs.stat(filePath), { code: "ENOENT" });
});

test("Phòng đủ 20 ảnh từ chối upload trước khi gọi Cloudinary", async () => {
  const assets = Array.from({ length: 20 }, (_, index) => ({
    public_id: `booking_bnb/listings/${listingId}/${index}`,
    user_id: hostId, listing_id: listingId, metadata: { url: "https://trusted" }, delete_requested: false,
  }));
  const db = fixture({ Listing: [{ ...listing, status: "draft" }], UploadedAsset: assets });
  const filePath = path.join(os.tmpdir(), `booking-upload-limit-${Date.now()}`);
  await fs.writeFile(filePath, "image");
  const service = loadBackend("services/host_listing_image.service.js", db.models, {
    "services/cloudinary.service.js": { uploadFile: async () => { throw new Error("Must not upload"); } },
  });
  await assert.rejects(service.upload({ id: hostId, role: "host" }, { path: filePath }, listingId), { status: 400 });
  assert.equal(db.rows("UploadedAsset").length, 20);
  await assert.rejects(fs.stat(filePath), { code: "ENOENT" });
});

test("Chữ ký tệp không khớp MIME bị chặn trước Cloudinary", async () => {
  const filePath = path.join(os.tmpdir(), `booking-upload-fake-${Date.now()}`);
  await fs.writeFile(filePath, "not a png");
  try {
    const service = loadBackend("services/cloudinary.service.js", {}, {
      "config/cloudinary.js": { initCloudinary: () => { throw new Error("Must not contact Cloudinary"); } },
    });
    await assert.rejects(service.uploadFile({ path: filePath, mimetype: "image/png" }), { status: 400 });
  } finally {
    await fs.unlink(filePath);
  }
});

test("Ảnh hợp lệ được truyền theo luồng với public_id đầy đủ", async () => {
  const filePath = path.join(os.tmpdir(), `booking-upload-stream-${Date.now()}`);
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
  await fs.writeFile(filePath, bytes);
  let options;
  let received = 0;
  try {
    const service = loadBackend("services/cloudinary.service.js", {}, {
      "config/cloudinary.js": { initCloudinary: () => ({ uploader: { upload_stream: (input, done) => {
        options = input;
        return new Writable({
          write(chunk, _encoding, callback) { received += chunk.length; callback(); },
          final(callback) { done(null, { public_id: input.public_id }); callback(); },
        });
      } } }) },
    });
    const publicId = `booking_bnb/listings/${listingId}/photo`;
    const result = await service.uploadFile({ path: filePath, mimetype: "image/png" }, publicId);
    assert.equal(result.public_id, publicId);
    assert.equal(options.public_id, publicId);
    assert.equal(options.folder, undefined);
    assert.equal(options.overwrite, false);
    assert.equal(received, bytes.length);
  } finally {
    await fs.unlink(filePath);
  }
});

test("Dọn ảnh quá hạn chưa gắn; giữ ảnh đã gắn và ảnh mới", async () => {
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
  const db = fixture({ UploadedAsset: [
    { public_id: "orphan", user_id: hostId, listing_id: listingId, metadata: {}, created_at: old, attached_at: null, delete_requested: false },
    { public_id: "attached", user_id: hostId, listing_id: listingId, metadata: {}, created_at: old, attached_at: old, delete_requested: false },
    { public_id: "recent", user_id: hostId, listing_id: listingId, metadata: {}, created_at: new Date(), attached_at: null, delete_requested: false },
  ] });
  const service = loadBackend("services/uploaded_asset.service.js", db.models);
  await service.cleanupExpiredUploads();
  assert.deepEqual(db.rows("BackgroundJob").map((job) => job.payload.public_id), ["orphan"]);
  assert.equal(db.rows("UploadedAsset").find((asset) => asset.public_id === "orphan").delete_requested, true);
});

test("Attach lấy URL từ server; lỗi insert rollback cover cũ", async () => {
  const db = fixture({ Listing: [{ ...listing, status: "draft" }], UploadedAsset: [{ public_id: "owned", user_id: hostId, metadata: { url: "https://trusted" } }], ListingImage: [{ id: "old", listing_id: listingId, is_cover: true }] });
  const service = loadBackend("services/host_listing_image.service.js", db.models, { "services/cloudinary.service.js": {} });
  const result = await service.attach({ id: hostId, role: "host" }, listingId, { public_id: "owned", url: "https://attacker", is_cover: true });
  assert.equal(result.image.url, "https://trusted");
  assert.equal(db.rows("ListingImage").filter((image) => image.is_cover).length, 1);
  db.failNextWrite("ListingImage");
  await assert.rejects(service.setCover({ id: hostId, role: "host" }, listingId, "old"));
  assert.equal(db.rows("ListingImage").find((image) => image.id === result.image.id).is_cover, true);
});

test("Xóa ảnh chỉ enqueue Cloudinary sau khi chứng minh namespace/chủ sở hữu", async () => {
  const db = fixture();
  const service = loadBackend("services/uploaded_asset.service.js", db.models);
  await db.models.sequelize.transaction(async (transaction) => {
    await service.enqueueDeletion({ public_id: "someone_else/asset" }, listing, transaction);
    await service.enqueueDeletion({ public_id: `booking_bnb/listings/${listingId}/asset` }, listing, transaction);
  });
  assert.equal(db.rows("BackgroundJob").length, 1);
});

test("Host xóa vĩnh viễn phòng đã đăng khi chưa có đơn đặt", async () => {
  const publicId = `booking_bnb/listings/${listingId}/cover`;
  const db = fixture({
    Booking: [], Payment: [],
    ListingImage: [{ id: "image", listing_id: listingId, public_id: publicId }],
    ListingAmenity: [{ id: "amenity-link", listing_id: listingId, amenity_id: guestId }],
    Favorite: [{ id: "favorite-link", listing_id: listingId, user_id: guestId }],
    UploadedAsset: [{ public_id: publicId, user_id: hostId, listing_id: listingId, metadata: {}, delete_requested: false }],
  });
  const service = loadBackend("services/host_listing.service.js", db.models);

  await service.deleteListing({ id: hostId, role: "host" }, listingId);

  for (const name of ["Listing", "ListingImage", "ListingAmenity", "Favorite"]) assert.equal(db.rows(name).length, 0);
  assert.equal(db.rows("UploadedAsset")[0].listing_id, null);
  assert.equal(db.rows("UploadedAsset")[0].delete_requested, true);
  assert.equal(db.rows("BackgroundJob")[0].type, "cloudinary_delete");
});

test("Host không thể xóa phòng của người khác hoặc phòng đã có lịch sử đặt", async () => {
  const foreignDb = fixture({ Booking: [], Payment: [] });
  const foreignService = loadBackend("services/host_listing.service.js", foreignDb.models);
  await assert.rejects(foreignService.deleteListing({ id: guestId, role: "host" }, listingId), { status: 403 });
  assert.equal(foreignDb.rows("Listing").length, 1);

  const bookedDb = fixture();
  const bookedService = loadBackend("services/host_listing.service.js", bookedDb.models);
  await assert.rejects(bookedService.deleteListing({ id: hostId, role: "host" }, listingId), { status: 409 });
  assert.equal(bookedDb.rows("Listing").length, 1);
  assert.equal(bookedDb.rows("Booking").length, 1);

  const reviewedDb = fixture({ Booking: [], Payment: [], Review: [{ id: "review", listing_id: listingId, deleted_at: new Date() }] });
  const reviewedService = loadBackend("services/host_listing.service.js", reviewedDb.models);
  await assert.rejects(reviewedService.deleteListing({ id: hostId, role: "host" }, listingId), { status: 409 });
  assert.equal(reviewedDb.rows("Listing").length, 1);
});

test("Xóa phòng lỗi thì hoàn tác cả liên kết và lệnh xóa ảnh", async () => {
  const publicId = `booking_bnb/listings/${listingId}/cover`;
  const db = fixture({
    Booking: [], Payment: [],
    ListingImage: [{ id: "image", listing_id: listingId, public_id: publicId }],
    UploadedAsset: [{ public_id: publicId, user_id: hostId, listing_id: listingId, metadata: {}, delete_requested: false }],
  });
  const service = loadBackend("services/host_listing.service.js", db.models);
  db.failNextWrite("Listing");

  await assert.rejects(service.deleteListing({ id: hostId, role: "host" }, listingId));
  assert.equal(db.rows("Listing").length, 1);
  assert.equal(db.rows("ListingImage").length, 1);
  assert.equal(db.rows("UploadedAsset")[0].listing_id, listingId);
  assert.equal(db.rows("BackgroundJob").length, 0);
});

test("Amenities không hợp lệ hoặc insert lỗi giữ nguyên liên kết cũ", async () => {
  const db = fixture({ Listing: [{ ...listing, status: "draft" }], Amenity: [{ id: guestId, is_active: true }], ListingAmenity: [{ id: "old", listing_id: listingId, amenity_id: guestId }] });
  const service = loadBackend("services/host_listing.service.js", db.models);
  await assert.rejects(service.setAmenities({ id: hostId, role: "host" }, listingId, [hostId]), { status: 400 });
  db.failNextWrite("ListingAmenity");
  await assert.rejects(service.setAmenities({ id: hostId, role: "host" }, listingId, [guestId]));
  assert.equal(db.rows("ListingAmenity")[0].id, "old");
});

test("Sửa phòng đã duyệt chuyển sang chờ duyệt và chỉ admin mới công khai lại", async () => {
  const db = fixture({
    ListingImage: [{ id: "cover", listing_id: listingId, is_cover: true }],
    ListingAmenity: [{ id: "amenity-link", listing_id: listingId, amenity_id: guestId }],
    Amenity: [{ id: guestId, is_active: true }],
  });
  const hostService = loadBackend("services/host_listing.service.js", db.models);
  const adminService = loadBackend("services/admin_listing.service.js", db.models);

  await hostService.update({ id: hostId, role: "host" }, listingId, { title: "Tiêu đề mới" });
  assert.equal(db.rows("Listing")[0].status, "pending");
  assert.equal(db.rows("Listing")[0].title, "Tiêu đề mới");
  await hostService.setAmenities({ id: hostId, role: "host" }, listingId, [guestId]);
  assert.equal(db.rows("Listing")[0].status, "pending");

  await adminService.approve(listingId);
  assert.equal(db.rows("Listing")[0].status, "published");
});

test("Sửa ảnh phòng đã duyệt cũng yêu cầu duyệt lại", async () => {
  const db = fixture({
    ListingImage: [{ id: "first", listing_id: listingId, is_cover: true }, { id: "second", listing_id: listingId, is_cover: false }],
  });
  const imageService = loadBackend("services/host_listing_image.service.js", db.models, { "services/cloudinary.service.js": {} });

  await imageService.setCover({ id: hostId, role: "host" }, listingId, "second");
  assert.equal(db.rows("Listing")[0].status, "pending");
  await imageService.remove({ id: hostId, role: "host" }, listingId, "first");
  assert.equal(db.rows("ListingImage").length, 1);

  const uploadDb = fixture({
    ListingImage: [{ id: "cover", listing_id: listingId, is_cover: true }],
    UploadedAsset: [{ public_id: "owned", user_id: hostId, listing_id: listingId, metadata: { url: "https://trusted", resource_type: "image" }, delete_requested: false }],
  });
  const uploadService = loadBackend("services/host_listing_image.service.js", uploadDb.models, { "services/cloudinary.service.js": {} });
  await uploadService.attach({ id: hostId, role: "host" }, listingId, { public_id: "owned" });
  assert.equal(uploadDb.rows("Listing")[0].status, "pending");
});

test("Admin không duyệt phòng thiếu ảnh hoặc tiện nghi sau khi host sửa", async () => {
  const db = fixture({ Listing: [{ ...listing, status: "pending" }] });
  const adminService = loadBackend("services/admin_listing.service.js", db.models);
  await assert.rejects(adminService.approve(listingId), { status: 400 });
  assert.equal(db.rows("Listing")[0].status, "pending");
});

test("Tạo payment method đồng thời chỉ có một default; xóa default chọn lại", async () => {
  const db = fixture();
  const service = loadBackend("services/account.service.js", db.models, cacheOverride);
  const body = { provider: "stripe", type: "card", label: "Visa", is_default: true };
  await Promise.all([service.createPaymentMethod(guestId, body), service.createPaymentMethod(guestId, body)]);
  assert.equal(db.rows("PaymentMethod").filter((row) => row.is_default).length, 1);
  await service.deletePaymentMethod(guestId, db.rows("PaymentMethod").find((row) => row.is_default).id);
  assert.equal(db.rows("PaymentMethod").filter((row) => row.is_default).length, 1);
});

test("Reset token được hash, không lộ trong API và reset revoke mọi refresh token", async () => {
  const db = fixture({ RefreshToken: [{ id: "refresh", user_id: guestId, revoked_at: null }] });
  const service = loadBackend("services/auth.service.js", db.models);
  await service.forgotPassword("guest@example.com");
  const raw = db.rows("BackgroundJob")[0].payload.html.match(/token=([a-f0-9]{64})/)[1];
  assert.equal(db.rows("User")[0].reset_password_token, createHash("sha256").update(raw).digest("hex"));
  assert.equal("reset_password_token" in service.sanitizeUser(db.rows("User")[0]), false);
  assert.equal("password_hash" in service.sanitizeUser({ password_hash: "secret", id: guestId }), false);
  await service.resetPassword(raw, "new-password");
  assert.equal(db.rows("User")[0].reset_password_token, null);
  assert.ok(db.rows("RefreshToken")[0].revoked_at);
  await assert.rejects(service.resetPassword(raw, "new-password"), { status: 400 });
});

test("Refresh đồng thời rotate đúng một lần, lỗi DB không revoke token cũ", async () => {
  const db = fixture();
  const service = loadBackend("services/auth.service.js", db.models);
  const tokens = await service.issueTokens(db.rows("User")[0]);
  const originalAuthTime = require("jsonwebtoken").verify(tokens.accessToken, "test-secret-only").authTime;
  const result = await Promise.allSettled([service.refresh(tokens.refreshToken), service.refresh(tokens.refreshToken)]);
  assert.equal(result.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(result.find((row) => row.status === "rejected").reason.status, 409);
  assert.equal(db.rows("RefreshToken").filter((row) => !row.revoked_at).length, 1);
  const rotated = result.find((row) => row.status === "fulfilled").value;
  assert.equal(require("jsonwebtoken").verify(rotated.accessToken, "test-secret-only").authTime, originalAuthTime);
  assert.equal(require("jsonwebtoken").verify(rotated.refreshToken, "test-secret-only").authTime, originalAuthTime);
  const fresh = rotated.refreshToken;
  db.failNextWrite("RefreshToken");
  await assert.rejects(service.refresh(fresh));
  assert.equal(db.rows("RefreshToken").filter((row) => !row.revoked_at).length, 1);
});

test("Refresh token cũ không có authTime vẫn dùng được nhưng không thành phiên xác thực gần đây", async () => {
  const legacy = require("jsonwebtoken").sign({ data: "legacy", type: "refresh" }, "test-secret-only", { expiresIn: "1h" });
  const db = fixture({ RefreshToken: [{ id: "legacy", user_id: guestId,
    token_hash: createHash("sha256").update(legacy).digest("hex"),
    expires_at: new Date(Date.now() + 60_000), revoked_at: null }] });
  const service = loadBackend("services/auth.service.js", db.models);
  const rotated = await service.refresh(legacy);
  assert.equal(require("jsonwebtoken").verify(rotated.accessToken, "test-secret-only").authTime, 0);
});

test("Đăng ký rollback khi enqueue email lỗi; xác minh rollback khi lưu phiên lỗi", async () => {
  const db = fixture({ User: [] });
  const service = loadBackend("services/auth.service.js", db.models);
  db.failNextWrite("BackgroundJob");
  await assert.rejects(service.registerLocal({ email: "new@example.com", password: "password123", full_name: "New User" }));
  assert.equal(db.rows("User").length, 0);
  await service.registerLocal({ email: "new@example.com", password: "password123", full_name: "New User" });
  const code = db.rows("BackgroundJob")[0].payload.html.match(/\b\d{6}\b/)[0];
  db.failNextWrite("RefreshToken");
  await assert.rejects(service.verifyRegistration({ email: "new@example.com", code }));
  assert.equal(db.rows("User")[0].status, "pending_verification");
  await assert.rejects(service.verifyRegistration({ email: "new@example.com", code: "000000" }), { status: 400 });
  assert.equal(db.rows("User")[0].registration_code_attempts, 1);
  const verified = await service.verifyRegistration({ email: "new@example.com", code });
  assert.equal(verified.user.status, "active");
  assert.equal(db.rows("User")[0].registration_code_hash, null);
  await service.forgotPassword("unknown@example.com");
  assert.equal(db.rows("BackgroundJob").length, 1);
});

test("Worker retry tác vụ lỗi, nhận lại lease hết hạn và chỉ xóa payload khi thành công", async () => {
  const db = fixture({ BackgroundJob: [{ id: "job", type: "send_email", payload: { to: "a@example.com", html: "secret" }, status: "running", attempts: 1, locked_at: new Date(Date.now() - 3600000), available_at: new Date() }] });
  let fail = true;
  const worker = loadBackend("jobs/backgroundJobs.js", db.models, {
    "utils/mailer.js": { sendEmail: async () => {
      assert.equal(db.rows("BackgroundJob")[0].status, "running");
      if (fail) throw new Error("provider failed");
    } }, "services/cloudinary.service.js": {}, "config/stripe.js": {},
  });
  await worker.runNextJob();
  assert.equal(db.rows("BackgroundJob")[0].status, "pending");
  assert.equal(db.rows("BackgroundJob")[0].payload.html, "secret");
  await db.models.BackgroundJob.update({ available_at: new Date(0) }, { where: { id: "job" } });
  fail = false;
  await worker.runNextJob();
  assert.equal(db.rows("BackgroundJob")[0].status, "completed");
  assert.equal(Object.keys(db.rows("BackgroundJob")[0].payload).length, 0);
});
