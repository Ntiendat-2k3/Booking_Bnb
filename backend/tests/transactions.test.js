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

test("Hai request cùng lịch chỉ tạo một booking; khoảng ngày liền kề vẫn được phép", async () => {
  const db = fixture({ Booking: [], Payment: [] });
  const service = loadBackend("services/booking.service.js", db.models);
  const input = { userId: guestId, listingId, check_in: "2099-01-01", check_out: "2099-01-03", guests_count: 2 };
  const results = await Promise.allSettled([service.create(input), service.create(input)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
  assert.equal(db.rows("Booking").length, 1);
  await service.create({ ...input, check_in: "2099-01-03", check_out: "2099-01-04" });
  assert.equal(db.rows("Booking").length, 2);
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
  assert.ok(db.rows("BackgroundJob")[0].payload.html.includes("&lt;script&gt;"));
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
  const stripe = { checkout: { sessions: { create: async (_input, options) => {
    assert.equal(db.rows("Payment").length, 1);
    keys.push(options.idempotencyKey);
    return { id: "cs_test", url: "https://checkout.stripe.com/test" };
  } } } };
  const service = loadBackend("services/payment.service.js", db.models, { "config/stripe.js": { getStripe: () => stripe } });
  await Promise.all([service.createStripePayment({ userId: guestId, bookingId }), service.createStripePayment({ userId: guestId, bookingId })]);
  assert.equal(db.rows("Payment").length, 1);
  assert.equal(new Set(keys).size, 1);
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

test("Amenities không hợp lệ hoặc insert lỗi giữ nguyên liên kết cũ", async () => {
  const db = fixture({ Listing: [{ ...listing, status: "draft" }], Amenity: [{ id: guestId, is_active: true }], ListingAmenity: [{ id: "old", listing_id: listingId, amenity_id: guestId }] });
  const service = loadBackend("services/host_listing.service.js", db.models);
  await assert.rejects(service.setAmenities({ id: hostId, role: "host" }, listingId, [hostId]), { status: 400 });
  db.failNextWrite("ListingAmenity");
  await assert.rejects(service.setAmenities({ id: hostId, role: "host" }, listingId, [guestId]));
  assert.equal(db.rows("ListingAmenity")[0].id, "old");
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
  const result = await Promise.allSettled([service.refresh(tokens.refreshToken), service.refresh(tokens.refreshToken)]);
  assert.equal(result.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(result.find((row) => row.status === "rejected").reason.status, 409);
  assert.equal(db.rows("RefreshToken").filter((row) => !row.revoked_at).length, 1);
  const fresh = result.find((row) => row.status === "fulfilled").value.refreshToken;
  db.failNextWrite("RefreshToken");
  await assert.rejects(service.refresh(fresh));
  assert.equal(db.rows("RefreshToken").filter((row) => !row.revoked_at).length, 1);
});

test("Đăng ký rollback user khi lưu refresh token lỗi; email lạ không tạo reset job", async () => {
  const db = fixture({ User: [] });
  const service = loadBackend("services/auth.service.js", db.models);
  db.failNextWrite("RefreshToken");
  await assert.rejects(service.registerLocal({ email: "new@example.com", password: "password123", full_name: "New User" }));
  assert.equal(db.rows("User").length, 0);
  await service.forgotPassword("unknown@example.com");
  assert.equal(db.rows("BackgroundJob").length, 0);
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
