const test = require("node:test");
const assert = require("node:assert/strict");
const { loadBackend, database } = require("./helpers");

const listingId = "50000000-0000-4000-8000-000000000001";
const listingId2 = "50000000-0000-4000-8000-000000000002";
const userId = "50000000-0000-4000-8000-000000000003";
const couponId = "50000000-0000-4000-8000-000000000004";
const bookingId = "50000000-0000-4000-8000-000000000005";
const bookingId2 = "50000000-0000-4000-8000-000000000006";
const listing = (id) => ({ id, host_id: "50000000-0000-4000-8000-000000000007",
  city: "Hà Nội", status: "published", price_per_night: "100000" });
const booking = (id, idOfListing, guestId = userId) => ({ id, listing_id: idOfListing,
  guest_id: guestId, status: "pending_payment", created_at: new Date(),
  check_in: "2099-12-25", check_out: "2099-12-27", currency: "VND",
  total_amount: "300000", price_breakdown_snapshot: { subtotal: "300000", fees: "0",
    discount: "0", total: "300000", nights: [{ date: "2099-12-25", price_per_night: "150000" },
      { date: "2099-12-26", price_per_night: "150000" }] } });
const coupon = (extra = {}) => ({ id: couponId, code: "WELCOME20", campaign_name: "Chào mừng",
  is_active: true, starts_at: new Date(Date.now() - 60000), ends_at: new Date(Date.now() + 86400000),
  discount_type: "percent", discount_value: "20", max_discount: "50000", min_subtotal: "200000",
  max_total_uses: 1, max_uses_per_user: 1, active_uses: 0, audience: "all", ...extra });

test("Voucher áp vào giá snapshot, giới hạn mức giảm và hoàn slot khi bỏ mã", async () => {
  const db = database({ Listing: [listing(listingId)], Booking: [booking(bookingId, listingId)],
    Coupon: [coupon()] });
  const service = loadBackend("services/coupon.service.js", db.models);
  const applied = await service.apply({ bookingId, userId, code: "welcome20" });
  assert.equal(applied.total_amount, "250000");
  assert.equal(applied.price_breakdown_snapshot.discount, "50000");
  assert.equal(db.rows("Coupon")[0].active_uses, 1);
  assert.equal(db.rows("CouponRedemption")[0].status, "reserved");
  const removed = await service.apply({ bookingId, userId, code: "" });
  assert.equal(removed.total_amount, "300000");
  assert.equal(db.rows("Coupon")[0].active_uses, 0);
  assert.equal(db.rows("CouponRedemption")[0].status, "released");
});

test("Hai booking đồng thời không thể vượt quá tổng lượt voucher", async () => {
  const db = database({ Listing: [listing(listingId), listing(listingId2)],
    Booking: [booking(bookingId, listingId), booking(bookingId2, listingId2,
      "50000000-0000-4000-8000-000000000008")], Coupon: [coupon()] });
  const service = loadBackend("services/coupon.service.js", db.models);
  const outcomes = await Promise.allSettled([
    service.apply({ bookingId, userId, code: "WELCOME20" }),
    service.apply({ bookingId: bookingId2, userId: "50000000-0000-4000-8000-000000000008",
      code: "WELCOME20" }),
  ]);
  assert.deepEqual(outcomes.map((item) => item.status).sort(), ["fulfilled", "rejected"]);
  assert.equal(outcomes.find((item) => item.status === "rejected").reason.message, "COUPON_EXHAUSTED");
  assert.equal(db.rows("Coupon")[0].active_uses, 1);
  assert.equal(db.rows("CouponRedemption").filter((item) => item.status === "reserved").length, 1);
});

test("Chốt lượt dùng sau thanh toán; booking đã thanh toán không trả slot", async () => {
  const db = database({ Listing: [listing(listingId)], Booking: [booking(bookingId, listingId)],
    Coupon: [coupon()] });
  const service = loadBackend("services/coupon.service.js", db.models);
  await service.apply({ bookingId, userId, code: "WELCOME20" });
  await db.models.sequelize.transaction(async (transaction) => {
    const row = await db.models.Booking.findByPk(bookingId, { transaction });
    await service.confirmForBooking(row, transaction);
    await service.releaseForBooking(row, transaction);
  });
  assert.equal(db.rows("CouponRedemption")[0].status, "redeemed");
  assert.equal(db.rows("Coupon")[0].active_uses, 1);
});

test("Đổi ngày làm giá dưới mức tối thiểu sẽ bỏ voucher và trả slot", async () => {
  const db = database({ Listing: [listing(listingId)], Booking: [booking(bookingId, listingId)],
    Coupon: [coupon()] });
  const service = loadBackend("services/coupon.service.js", db.models);
  await service.apply({ bookingId, userId, code: "WELCOME20" });
  const result = await db.models.sequelize.transaction(async (transaction) => {
    const row = await db.models.Booking.findByPk(bookingId, { transaction });
    return service.repriceBooking(row, listing(listingId), { subtotal: "100000", fees: "0",
      discount: "0", total: "100000", nights: [] }, transaction);
  });
  assert.equal(result.total, "100000");
  assert.equal(db.rows("CouponRedemption")[0].status, "released");
  assert.equal(db.rows("Coupon")[0].active_uses, 0);
});

test("Voucher hết hạn, không đúng phòng và khách cũ trả lý do riêng", async () => {
  const db = database({ Listing: [listing(listingId)], Booking: [booking(bookingId, listingId)],
    Coupon: [coupon({ ends_at: new Date(Date.now() - 1000) })] });
  const service = loadBackend("services/coupon.service.js", db.models);
  await assert.rejects(service.apply({ bookingId, userId, code: "WELCOME20" }),
    { status: 422, message: "COUPON_EXPIRED" });
  await db.models.Coupon.update({ ends_at: new Date(Date.now() + 86400000), listing_id: listingId2 },
    { where: { id: couponId } });
  await assert.rejects(service.apply({ bookingId, userId, code: "WELCOME20" }),
    { status: 422, message: "COUPON_NOT_APPLICABLE" });
  await db.models.Coupon.update({ listing_id: null, audience: "new_guest" }, { where: { id: couponId } });
  await db.models.Booking.create({ ...booking(bookingId2, listingId), status: "confirmed" });
  await assert.rejects(service.apply({ bookingId, userId, code: "WELCOME20" }),
    { status: 422, message: "COUPON_NEW_GUEST_ONLY" });
});

test("Khách từng thanh toán rồi hủy không còn thuộc nhóm khách mới", async () => {
  const oldBooking = booking(bookingId2, listingId);
  oldBooking.status = "cancelled";
  const db = database({ Listing: [listing(listingId)],
    Booking: [booking(bookingId, listingId), oldBooking],
    Payment: [{ id: "50000000-0000-4000-8000-000000000009", booking_id: bookingId2,
      status: "refunded" }], Coupon: [coupon({ audience: "new_guest" })] });
  const service = loadBackend("services/coupon.service.js", db.models);
  await assert.rejects(service.apply({ bookingId, userId, code: "WELCOME20" }),
    { status: 422, message: "COUPON_NEW_GUEST_ONLY" });
});

test("Nhóm khách quay lại chỉ chấp nhận tài khoản từng thanh toán", async () => {
  const db = database({ Listing: [listing(listingId)], Booking: [booking(bookingId, listingId)],
    Coupon: [coupon({ audience: "returning_guest" })] });
  const service = loadBackend("services/coupon.service.js", db.models);
  await assert.rejects(service.apply({ bookingId, userId, code: "WELCOME20" }),
    { status: 422, message: "COUPON_RETURNING_GUEST_ONLY" });
  await db.models.Booking.create({ ...booking(bookingId2, listingId), status: "completed" });
  const applied = await service.apply({ bookingId, userId, code: "WELCOME20" });
  assert.equal(applied.total_amount, "250000");
});

test("Thông báo chiến dịch chỉ đến tài khoản đã bật nhận ưu đãi", async () => {
  const otherUser = "50000000-0000-4000-8000-000000000008";
  const db = database({ Coupon: [coupon()], User: [
    { id: userId, status: "active" }, { id: otherUser, status: "active" }],
  NotificationPreference: [{ user_id: otherUser, offers: false }] });
  const service = loadBackend("services/coupon.service.js", db.models);
  await service.notifyEligible(couponId);
  assert.deepEqual(db.rows("Notification").map((item) => item.user_id), [userId]);
  await service.notifyEligible(couponId);
  assert.equal(db.rows("Notification").length, 1);
});

test("Ưu đãi theo phòng chỉ thông báo cho khách đã yêu thích phòng đó", async () => {
  const otherUser = "50000000-0000-4000-8000-000000000008";
  const db = database({ Coupon: [coupon({ listing_id: listingId })],
    Listing: [listing(listingId), listing(listingId2)],
    User: [{ id: userId, status: "active" }, { id: otherUser, status: "active" }],
    Favorite: [{ user_id: userId, listing_id: listingId2 },
      { user_id: otherUser, listing_id: listingId }] });
  const service = loadBackend("services/coupon.service.js", db.models);
  await service.notifyEligible(couponId);
  assert.deepEqual(db.rows("Notification").map((item) => item.user_id), [otherUser]);
});

test("Admin tạo mã chuẩn hóa chữ hoa, chống trùng và lên lịch thông báo", async () => {
  const db = database();
  const service = loadBackend("services/coupon.service.js", db.models);
  const input = { code: "welcome20", campaign_name: "Chào mừng", discount_type: "percent",
    discount_value: 20, min_subtotal: 0, starts_at: new Date(Date.now() - 1000),
    ends_at: new Date(Date.now() + 86400000), audience: "all", notify_users: true };
  const created = await service.create(input, { id: userId });
  assert.equal(created.code, "WELCOME20");
  assert.equal(db.rows("BackgroundJob")[0].type, "promotion_notify");
  await assert.rejects(service.create(input, { id: userId }),
    { status: 409, message: "COUPON_CODE_EXISTS" });
  assert.equal(db.rows("Coupon").length, 1);
});
