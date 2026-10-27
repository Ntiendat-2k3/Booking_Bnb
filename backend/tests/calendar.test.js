const test = require("node:test");
const assert = require("node:assert/strict");
const Sequelize = require("sequelize");
const { loadBackend, database } = require("./helpers");

const listingId = "20000000-0000-4000-8000-000000000001";
const hostId = "20000000-0000-4000-8000-000000000002";
const otherHostId = "20000000-0000-4000-8000-000000000003";
const guestId = "20000000-0000-4000-8000-000000000004";
const listing = { id: listingId, host_id: hostId, title: "Studio", status: "published", deleted_at: null,
  max_guests: 3, price_per_night: "100000" };
const host = { id: hostId, role: "host" };
const booking = { id: "20000000-0000-4000-8000-000000000005", reference_number: 1,
  listing_id: listingId, guest_id: guestId, check_in: "2099-01-10", check_out: "2099-01-12",
  status: "confirmed", guests_count: 2, created_at: new Date() };

test("Lịch công khai giữ kín booking ID và bỏ qua hold hết hạn", async () => {
  const db = database({ Listing: [listing], Booking: [
    booking,
    { ...booking, id: "20000000-0000-4000-8000-000000000006", status: "pending_payment",
      check_in: "2099-01-12", check_out: "2099-01-13" },
    { ...booking, id: "20000000-0000-4000-8000-000000000007", status: "pending_payment",
      check_in: "2099-01-13", check_out: "2099-01-14", created_at: new Date(Date.now() - 3600000) },
  ], ListingCalendarBlock: [{ id: "20000000-0000-4000-8000-000000000008", listing_id: listingId,
    start_date: "2099-01-14", end_date: "2099-01-16", reason: "Bảo trì", created_by: hostId }] });
  const service = loadBackend("services/calendar.service.js", db.models);
  const publicData = await service.publicAvailability(listingId, { start_date: "2099-01-09", end_date: "2099-01-17" });
  assert.equal(publicData.show_public_calendar, false);
  assert.equal(publicData.intervals.map((item) => item.status).sort().join(","), "unavailable,unavailable,unavailable");
  assert.ok(publicData.intervals.every((item) => !item.id && !item.reason));
  const hostData = await service.forHost(host, { listing_id: listingId, start_date: "2099-01-09", end_date: "2099-01-17" });
  assert.equal(hostData.bookings.length, 2);
  assert.equal(hostData.bookings[0].booking_code, "BNB-00000001");
});

test("Chỉ người quản lý bật lịch công khai cho phòng đã đăng; tắt lịch không đổi trạng thái phòng", async () => {
  const db = database({ Listing: [listing] });
  const service = loadBackend("services/calendar.service.js", db.models);
  const input = { listing_id: listingId, visible: true };
  await assert.rejects(service.setPublicVisibility({ id: otherHostId, role: "host" }, input), { status: 403 });
  const enabled = await service.setPublicVisibility(host, input);
  assert.equal(enabled.show_public_calendar, true);
  assert.equal(db.rows("Listing")[0].status, "published");
  const publicData = await service.publicAvailability(listingId,
    { start_date: "2099-01-01", end_date: "2099-02-01" });
  assert.equal(publicData.show_public_calendar, true);
  await service.setPublicVisibility(host, { ...input, visible: false });
  assert.equal(db.rows("Listing")[0].show_public_calendar, false);

  const draft = database({ Listing: [{ ...listing, status: "draft" }] });
  await assert.rejects(loadBackend("services/calendar.service.js", draft.models)
    .setPublicVisibility(host, input), { status: 409 });
});

test("Host chỉ khóa phòng mình quản lý và không đè lên booking; mở một phần block giữ hai đầu", async () => {
  const db = database({ Listing: [listing], Booking: [booking] });
  const service = loadBackend("services/calendar.service.js", db.models);
  const range = { listing_id: listingId, start_date: "2099-01-09", end_date: "2099-01-13" };
  await assert.rejects(service.block({ id: otherHostId, role: "host" }, range), { status: 403 });
  await assert.rejects(service.block(host, range), { status: 409 });
  assert.equal(db.rows("ListingCalendarBlock").length, 0);
  await service.block(host, { listing_id: listingId, start_date: "2099-01-13", end_date: "2099-01-20", reason: "Sửa phòng" });
  await assert.rejects(service.block(host, { listing_id: listingId, start_date: "2099-01-14", end_date: "2099-01-16" }), { status: 409 });
  await service.unblock(host, { listing_id: listingId, start_date: "2099-01-15", end_date: "2099-01-17" });
  assert.deepEqual(db.rows("ListingCalendarBlock").map((item) => [item.start_date, item.end_date]).sort(),
    [["2099-01-13", "2099-01-15"], ["2099-01-17", "2099-01-20"]]);
  assert.ok(db.rows("ListingCalendarBlock").every((item) => item.reason === "Sửa phòng"));
  await loadBackend("services/booking.service.js", db.models).create({
    userId: guestId, listingId, check_in: "2099-01-15", check_out: "2099-01-16",
  });
});

test("Ngày trả phòng vẫn giữ lịch khi chưa có giờ nhận và trả phòng", async () => {
  const db = database({ Listing: [listing], Booking: [booking] });
  const calendar = loadBackend("services/calendar.service.js", db.models);
  const bookings = loadBackend("services/booking.service.js", db.models);
  const hostDay = await calendar.forHost(host, { listing_id: listingId,
    start_date: "2099-01-12", end_date: "2099-01-13" });
  assert.equal(hostDay.bookings.length, 1);
  const publicDay = await calendar.publicAvailability(listingId,
    { start_date: "2099-01-12", end_date: "2099-01-13" });
  assert.equal(publicDay.intervals.length, 1);
  assert.equal(publicDay.intervals[0].start_date, "2099-01-10");
  assert.equal(publicDay.intervals[0].end_date, "2099-01-13");
  assert.equal(publicDay.intervals[0].status, "unavailable");
  await assert.rejects(bookings.create({ userId: guestId, listingId,
    check_in: "2099-01-12", check_out: "2099-01-13" }), { status: 409 });
  await assert.rejects(calendar.block(host, { listing_id: listingId,
    start_date: "2099-01-12", end_date: "2099-01-13" }), { status: 409 });
  await bookings.create({ userId: guestId, listingId,
    check_in: "2099-01-13", check_out: "2099-01-14" });

  const blocked = database({ Listing: [listing], ListingCalendarBlock: [{
    id: "20000000-0000-4000-8000-000000000010", listing_id: listingId,
    start_date: "2099-01-12", end_date: "2099-01-13", created_by: hostId,
  }] });
  await assert.rejects(loadBackend("services/booking.service.js", blocked.models).create({
    userId: guestId, listingId, check_in: "2099-01-10", check_out: "2099-01-12",
  }), { status: 409 });
});

test("Giữ chỗ còn hạn cản Host khóa, giữ chỗ hết hạn nhường lịch ngay", async () => {
  const pending = { ...booking, status: "pending_payment", check_in: "2099-02-10", check_out: "2099-02-12" };
  const db = database({ Listing: [listing], Booking: [pending] });
  const service = loadBackend("services/calendar.service.js", db.models);
  const range = { listing_id: listingId, start_date: pending.check_in, end_date: pending.check_out };
  await assert.rejects(service.block(host, range), { status: 409 });
  await db.models.Booking.update({ created_at: new Date(Date.now() - 3600000) }, { where: { id: booking.id } });
  await service.block(host, range);
  assert.equal(db.rows("ListingCalendarBlock").length, 1);
});

test("Tạo booking và khóa lịch cùng lúc chỉ một thao tác thành công; sửa booking vào block bị từ chối", async () => {
  const db = database({ Listing: [listing] });
  const calendar = loadBackend("services/calendar.service.js", db.models);
  const bookings = loadBackend("services/booking.service.js", db.models);
  const range = { listing_id: listingId, start_date: "2099-02-01", end_date: "2099-02-04" };
  const results = await Promise.allSettled([
    calendar.block(host, range),
    bookings.create({ userId: guestId, listingId, check_in: range.start_date, check_out: range.end_date }),
  ]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(results.find((item) => item.status === "rejected").reason.status, 409);

  const second = database({ Listing: [listing], Booking: [{ ...booking, status: "pending_payment" }],
    ListingCalendarBlock: [{ id: "20000000-0000-4000-8000-000000000009", listing_id: listingId,
      start_date: "2099-01-12", end_date: "2099-01-15", created_by: hostId }] });
  await assert.rejects(loadBackend("services/booking.service.js", second.models).update({
    userId: guestId, bookingId: booking.id, check_out: "2099-01-13",
  }), { status: 409 });
});

test("Bộ lọc tìm kiếm yêu cầu cặp ngày và lọc cả booking lẫn block trước phân trang", () => {
  const schema = require("../requests/api/v1/listing.schema").listingQuerySchema;
  assert.ok(schema.validate({ check_in: "2099-01-10" }).error);
  assert.ok(schema.validate({ check_in: "2099-01-12", check_out: "2099-01-10" }).error);
  assert.equal(schema.validate({ check_in: "2099-01-10", check_out: "2099-01-12" }).error, undefined);
  const db = database();
  const repo = new (loadBackend("repositories/listing.repository.js", db.models))();
  const where = repo.buildWhere({ check_in: "2099-01-10", check_out: "2099-01-12" });
  const conditions = where[Sequelize.Op.and].map((item) => item.val || "").join(" ");
  assert.match(conditions, /NOT EXISTS[\s\S]*FROM bookings/);
  assert.match(conditions, /NOT EXISTS[\s\S]*FROM listing_calendar_blocks/);
  assert.match(conditions, /pending_payment/);
  assert.match(conditions, /b\.check_in <= '2099-01-12' AND b\.check_out >= '2099-01-10'/);
  assert.match(conditions, /cb\.start_date <= '2099-01-12' AND cb\.end_date > '2099-01-10'/);
});
