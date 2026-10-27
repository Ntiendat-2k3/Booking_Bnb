const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { database, loadBackend } = require("./helpers");
const { issueQrSchema, scanQrSchema, manualStaySchema, hostStayQuery } = require("../requests/api/v1/booking-stay.schema");

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const host = { id: "host-1", role: "host" };
const guest = { id: "guest-1", role: "guest" };
const listingId = "listing-1";
const bookingId = "booking-1";

function setup(bookingPatch = {}) {
  const db = database({
    Listing: [
      { id: listingId, host_id: host.id, title: "Phòng A", reference_number: "2", deleted_at: null },
      { id: "listing-2", host_id: host.id, title: "Phòng B", deleted_at: null },
    ],
    Booking: [{ id: bookingId, listing_id: listingId, guest_id: guest.id,
      reference_number: "1", status: "confirmed", stay_status: "not_checked_in",
      check_in: day(-1), check_out: day(2), guests_count: 2, total_amount: "200000",
      currency: "VND", created_at: new Date("2026-10-20T08:00:00Z"),
      renter_name: "Khách đặt phòng", renter_phone: "0901234567",
      guest: { full_name: "Tên hồ sơ đã đổi", phone: "0999999999" }, ...bookingPatch }],
    Payment: [{ id: "payment-1", booking_id: bookingId, provider: "stripe", status: "succeeded" }],
    User: [{ id: guest.id, full_name: "Khách A", phone: "0901234567" }],
  });
  const notices = [];
  const service = loadBackend("services/booking_stay.service.js", db.models, {
    "services/host_listing.service.js": {
      async getByIdForUser(user, id, options) {
        const listing = await db.models.Listing.findByPk(id, options);
        if (!listing) throw Object.assign(new Error("Not found"), { status: 404 });
        if (listing.host_id !== user.id && user.role !== "admin")
          throw Object.assign(new Error("Forbidden"), { status: 403 });
        return { listing };
      },
    },
    "services/notification.service.js": {
      async recordStayUpdate({ event }) { notices.push(event.action); },
      publishBookingChanged() {},
    },
  });
  return { db, service, notices };
}

test("QR chỉ cấp cho Guest của booking đã xác nhận và không lưu token thô", async () => {
  const { db, service } = setup();
  await assert.rejects(service.issueQr({ guestId: "other", bookingId, purpose: "check_in" }), { status: 404 });
  const result = await service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" });
  assert.match(result.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(db.rows("BookingStayToken")[0].token_hash,
    createHash("sha256").update(result.token).digest("hex"));
  assert.notEqual(db.rows("BookingStayToken")[0].token_hash, result.token);
  assert.equal(db.rows("BookingStayEvent")[0].action, "qr_issued");
  const pending = setup({ status: "pending_payment" });
  await assert.rejects(pending.service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" }), { status: 409 });
  const early = setup({ check_in: day(2), check_out: day(4) });
  await assert.rejects(early.service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" }), { status: 409 });
});

test("QR nhận phòng mở từ nửa đêm giờ Việt Nam dù UTC còn là ngày trước", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-25T17:42:00Z") });
  const { service } = setup({ check_in: "2026-10-26", check_out: "2026-10-28" });
  const result = await service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" });
  assert.match(result.token, /^[A-Za-z0-9_-]{43}$/);
});

test("Host quét QR tự nhận diện phòng, check-in một lần và có audit", async () => {
  const { db, service, notices } = setup();
  const { token } = await service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" });
  const preview = await service.inspectQr({ user: host, rawToken: token });
  assert.equal(preview.booking.booking_code, "BNB-00000001");
  assert.equal(preview.listing.listing_code, "ROOM-00000002");
  assert.equal(preview.booking.total_amount, "200000");
  assert.equal(preview.booking.guest_name, "Khách đặt phòng");
  assert.equal(preview.booking.guest_phone, "0901234567");
  assert.equal(new Date(preview.booking.booked_at).toISOString(), "2026-10-20T08:00:00.000Z");
  assert.equal(preview.purpose, "check_in");
  const result = await service.confirmQr({ user: host, listingId, rawToken: token });
  assert.equal(result.stay_status, "checked_in");
  assert.equal(db.rows("Booking")[0].checked_in_by, host.id);
  assert.ok(db.rows("Booking")[0].actual_check_in_at);
  assert.ok(db.rows("BookingStayToken")[0].used_at);
  assert.deepEqual(notices, ["checked_in"]);
  assert.equal(db.rows("BookingStayEvent")[1].method, "qr");
  const usedPreview = await service.inspectQr({ user: host, rawToken: token });
  assert.equal(usedPreview.already_used, true);
  assert.equal(usedPreview.booking.stay_status, "checked_in");
  assert.equal(usedPreview.used_at, db.rows("BookingStayToken")[0].used_at.toISOString());
  assert.equal(usedPreview.listing.id, listingId);
  await assert.rejects(service.confirmQr({ user: host, listingId, rawToken: token }), { status: 410 });
  await assert.rejects(service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" }), { status: 409 });
  assert.equal(db.rows("BookingStayEvent").length, 2);
});

test("Host xem được QR trước ngày nhận phòng nhưng chỉ xác nhận từ ngày đó", async () => {
  const { db, service } = setup({ check_in: day(2), check_out: day(4) });
  const token = "a".repeat(43);
  await db.models.BookingStayToken.create({ booking_id: bookingId, purpose: "verify",
    token_hash: createHash("sha256").update(token).digest("hex"),
    expires_at: new Date(Date.now() + 5 * 86400000) });
  const preview = await service.inspectQr({ user: host, rawToken: token });
  assert.equal(preview.purpose, "check_in");
  assert.equal(preview.booking.guest_name, "Khách đặt phòng");
  await assert.rejects(service.confirmQr({ user: host, rawToken: token }), { status: 409 });
  assert.equal(db.rows("Booking")[0].stay_status, "not_checked_in");
});

test("QR trả phòng chỉ xem trước ngày trả; quét hoặc xác nhận thủ công đều không trả sớm", async () => {
  const { db, service } = setup({ stay_status: "checked_in", actual_check_in_at: new Date() });
  const token = "b".repeat(43);
  await db.models.BookingStayToken.create({ booking_id: bookingId, purpose: "check_out",
    token_hash: createHash("sha256").update(token).digest("hex"),
    expires_at: new Date(Date.now() + 300000) });
  const preview = await service.inspectQr({ user: host, rawToken: token });
  assert.equal(preview.purpose, "check_out");
  await assert.rejects(service.issueQr({ guestId: guest.id, bookingId, purpose: "check_out" }), { status: 409 });
  await assert.rejects(service.confirmQr({ user: host, rawToken: token }), { status: 409 });
  await assert.rejects(service.manual({ user: host, listingId, bookingId, purpose: "check_out",
    reason: "Khách yêu cầu trả phòng" }), { status: 409 });
  assert.equal(db.rows("Booking")[0].stay_status, "checked_in");
  assert.equal(db.rows("Booking")[0].actual_check_out_at, undefined);
});

test("Mã hết hạn, mã giả và Host không có quyền đều không đổi lưu trú", async () => {
  const { db, service } = setup();
  const { token } = await service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" });
  await assert.rejects(service.inspectQr({ user: { id: "other", role: "host" }, rawToken: token }), { status: 403 });
  await assert.rejects(service.confirmQr({ user: { id: "other", role: "host" }, rawToken: token }), { status: 403 });
  await assert.rejects(service.confirmQr({ user: host, listingId, rawToken: "x".repeat(43) }), { status: 410 });
  db.rows("BookingStayToken")[0].expires_at = new Date(Date.now() - 1000);
  await assert.rejects(service.confirmQr({ user: host, listingId, rawToken: token }), { status: 410 });
  assert.equal(db.rows("Booking")[0].stay_status, "not_checked_in");
});

test("Hai lần quét đồng thời chỉ ghi một check-in", async () => {
  const { db, service } = setup();
  const { token } = await service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" });
  const results = await Promise.allSettled([
    service.confirmQr({ user: host, listingId, rawToken: token }),
    service.confirmQr({ user: host, listingId, rawToken: token }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(db.rows("BookingStayEvent").filter((event) => event.action === "checked_in").length, 1);
});

test("Làm mới QR và check-in thủ công vô hiệu hóa mọi mã check-in cũ", async () => {
  const { db, service } = setup();
  const first = await service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" });
  const second = await service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" });
  assert.ok(db.rows("BookingStayToken")[0].revoked_at);
  await assert.rejects(service.inspectQr({ user: host, listingId, rawToken: first.token }), { status: 410 });
  await assert.rejects(service.confirmQr({ user: host, listingId, rawToken: first.token }), { status: 410 });
  await service.manual({ user: host, listingId, bookingId, purpose: "check_in",
    reason: "Khách không mở được mã QR" });
  await assert.rejects(service.confirmQr({ user: host, listingId, rawToken: second.token }), { status: 410 });
  assert.equal(db.rows("BookingStayEvent").filter((event) => event.action === "checked_in").length, 1);
});

test("Không nhận phòng sau ngày trả, không thao tác thủ công sai Host hoặc sai phòng", async () => {
  const late = setup({ check_in: day(-3), check_out: day(-1) });
  await assert.rejects(late.service.issueQr({ guestId: guest.id, bookingId, purpose: "check_in" }), { status: 409 });
  const { db, service } = setup();
  const args = { listingId, bookingId, purpose: "check_in", reason: "Khách không quét được mã" };
  await assert.rejects(service.manual({ user: { id: "other", role: "host" }, ...args }), { status: 403 });
  await assert.rejects(service.manual({ user: host, ...args, listingId: "listing-2" }), { status: 404 });
  assert.equal(db.rows("Booking")[0].stay_status, "not_checked_in");
  assert.equal(db.rows("BookingStayEvent").length, 0);
});

test("Host có thể check-in thủ công rồi check-out bằng QR từ đúng ngày trả phòng", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-27T12:00:00Z") });
  const { db, service, notices } = setup({ check_in: "2026-10-27", check_out: "2026-10-28" });
  const checkedIn = await service.manual({ user: host, listingId, bookingId,
    purpose: "check_in", reason: "Khách không quét được mã" });
  assert.equal(checkedIn.stay_status, "checked_in");
  assert.equal(db.rows("BookingStayEvent")[0].reason, "Khách không quét được mã");
  t.mock.timers.setTime(new Date("2026-10-27T17:05:00Z").getTime());
  const { token } = await service.issueQr({ guestId: guest.id, bookingId, purpose: "check_out" });
  const checkedOut = await service.confirmQr({ user: host, listingId, rawToken: token });
  assert.equal(checkedOut.stay_status, "checked_out");
  assert.equal(db.rows("Booking")[0].status, "completed");
  assert.ok(db.rows("Booking")[0].actual_check_out_at);
  assert.deepEqual(notices, ["checked_in", "checked_out"]);
  const usedPreview = await service.inspectQr({ user: host, listingId, rawToken: token });
  assert.equal(usedPreview.already_used, true);
  assert.equal(usedPreview.purpose, "check_out");
  assert.equal(usedPreview.used_at, db.rows("BookingStayToken")[0].used_at.toISOString());
  await assert.rejects(service.confirmQr({ user: host, listingId, rawToken: token }), { status: 410 });
  await assert.rejects(service.manual({ user: host, listingId, bookingId,
    purpose: "check_out", reason: "Thử lại" }), { status: 409 });
  const events = await service.eventsForHost({ user: host, listingId, bookingId });
  assert.deepEqual(events.map((event) => event.action), ["checked_in", "qr_issued", "checked_out"]);
});

test("Tra theo mã BNB đúng phòng và schema yêu cầu lý do, token hợp lệ", async () => {
  const { service } = setup();
  const result = await service.listForHost({ user: host, listingId, code: "BNB-00000001" });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].booking_code, "BNB-00000001");
  assert.equal(result.items[0].guest_phone, "0901234567");
  assert.equal(result.items[0].total_amount, "200000");
  assert.ok(manualStaySchema.validate({ listing_id: "00000000-0000-4000-8000-000000000001",
    purpose: "check_in", reason: "" }).error);
  assert.ok(scanQrSchema.validate({ listing_id: "00000000-0000-4000-8000-000000000001", token: "123" }).error);
  assert.ok(scanQrSchema.validate({ token: "a".repeat(43) }).value);
  assert.equal(hostStayQuery.validate({}).value.page, 1);
  assert.ok(issueQrSchema.validate({ purpose: "check_in" }).value);
});

test("Danh sách mặc định gồm booking của mọi phòng Host sở hữu", async () => {
  const { db, service } = setup();
  await db.models.Booking.create({ id: "booking-2", listing_id: "listing-2", guest_id: guest.id,
    reference_number: "2", status: "confirmed", stay_status: "not_checked_in",
    check_in: day(1), check_out: day(3), total_amount: "300000", currency: "VND" });
  const all = await service.listForHost({ user: host });
  assert.equal(all.items.length, 2);
  assert.equal(all.meta.total, 2);
  assert.equal(all.items.find((item) => item.id === "booking-2").listing.title, "Phòng B");
  assert.equal((await service.listForHost({ user: host, listingId })).items.length, 1);
  await db.models.Listing.update({ host_id: "other" }, { where: { id: "listing-2" } });
  assert.equal((await service.listForHost({ user: host })).items.length, 1);
});

test("Danh sách booking phân trang mà vẫn trả đủ tổng số", async () => {
  const { db, service } = setup();
  await Promise.all(Array.from({ length: 100 }, (_, index) => db.models.Booking.create({
    id: `extra-${index}`, listing_id: listingId, guest_id: guest.id,
    reference_number: String(index + 2), status: "confirmed", stay_status: "not_checked_in",
    check_in: day(1), check_out: day(3), total_amount: "300000", currency: "VND",
  })));
  const first = await service.listForHost({ user: host });
  const second = await service.listForHost({ user: host, page: 2 });
  assert.equal(first.items.length, 100);
  assert.equal(second.items.length, 1);
  assert.equal(first.meta.total, 101);
  assert.equal(second.meta.total_pages, 2);
});

test("Sự kiện nhận/trả phòng tạo thông báo đúng người và không ghi trùng", async () => {
  const db = database();
  const notifications = loadBackend("services/notification.service.js", db.models, {
    "services/chat.socket.js": { emitToUsers() {} },
  });
  const booking = { id: bookingId, guest_id: guest.id };
  const listing = { id: listingId, host_id: host.id, title: "Phòng A" };
  const event = { id: "event-1", action: "checked_in" };
  await db.models.sequelize.transaction(async (transaction) => {
    await notifications.recordStayUpdate({ booking, listing, event, transaction });
    await notifications.recordStayUpdate({ booking, listing, event, transaction });
  });
  assert.equal(db.rows("Notification").length, 2);
  assert.deepEqual(new Set(db.rows("Notification").map((row) => row.user_id)), new Set([host.id, guest.id]));
  assert.ok(db.rows("Notification").every((row) => row.type === "stay_checked_in"));
  assert.equal(db.rows("Notification").find((row) => row.user_id === host.id).resource_type, "host_stay");
});
