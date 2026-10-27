const test = require("node:test");
const assert = require("node:assert/strict");
const Sequelize = require("sequelize");
const { loadBackend } = require("./helpers");

const firstId = "10000000-0000-4000-8000-000000000001";
const secondId = "10000000-0000-4000-8000-000000000002";
const thirdId = "10000000-0000-4000-8000-000000000003";
const userId = "20000000-0000-4000-8000-000000000001";
const otherUserId = "20000000-0000-4000-8000-000000000002";

function fixture() {
  const rows = [
    { id: firstId, user_id: userId, type: "message_received", created_at: new Date("2026-10-22T12:00:00Z"), is_read: false },
    { id: secondId, user_id: userId, type: "booking_confirmed", created_at: new Date("2026-10-22T12:00:00Z"), is_read: false },
    { id: thirdId, user_id: userId, type: "listing_approved", created_at: new Date("2026-10-21T12:00:00Z"), is_read: false },
    { id: "10000000-0000-4000-8000-000000000004", user_id: userId, type: "new_event", created_at: new Date("2026-10-20T12:00:00Z"), is_read: true },
    { id: "10000000-0000-4000-8000-000000000005", user_id: otherUserId, type: "message_received", created_at: new Date("2026-10-23T12:00:00Z"), is_read: false },
  ];
  const matches = (row, where) => Reflect.ownKeys(where).every((key) => {
    if (key === Sequelize.Op.or) return where[key].some((part) => matches(row, part));
    const expected = where[key];
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if (expected[Sequelize.Op.in]) return expected[Sequelize.Op.in].includes(row[key]);
      if (expected[Sequelize.Op.notIn]) return !expected[Sequelize.Op.notIn].includes(row[key]);
      if (expected[Sequelize.Op.lt]) return row[key] < expected[Sequelize.Op.lt];
    }
    return row[key] instanceof Date ? row[key].getTime() === expected.getTime() : row[key] === expected;
  });
  const Notification = {
    findAll: async ({ where, group, limit }) => {
      const selected = rows.filter((row) => matches(row, where));
      if (group) return [...new Set(selected.map((row) => row.type))]
        .map((type) => ({ type, count: String(selected.filter((row) => row.type === type).length) }));
      return selected.sort((a, b) => b.created_at - a.created_at || b.id.localeCompare(a.id))
        .slice(0, limit).map((row) => ({ ...row, toJSON: () => ({ ...row }) }));
    },
    findOne: async ({ where }) => {
      const row = rows.find((item) => matches(item, where));
      return row ? { update: async (patch) => Object.assign(row, patch) } : null;
    },
  };
  const service = loadBackend("services/notification.service.js", { Notification, Sequelize }, {
    "services/chat.socket.js": { emitToUsers() {} },
    "services/notification-preference.service.js": {},
  });
  return { service };
}

test("Feed phân loại, đếm toàn bộ unread và phân trang ổn định khi trùng thời gian", async () => {
  const { service } = fixture();
  const first = await service.feed(userId, { category: "all", limit: 1 });
  assert.equal(first.items[0].id, secondId);
  assert.equal(first.items[0].category, "bookings");
  assert.equal(first.meta.total_unread, 3);
  assert.equal(first.meta.unread_by_category.messages, 1);
  assert.equal(first.meta.unread_by_category.bookings, 1);
  assert.equal(first.meta.unread_by_category.listings, 1);
  assert.equal(first.meta.has_more, true);
  const next = await service.feed(userId, { category: "all", limit: 1, cursor: first.meta.next_cursor });
  assert.equal(next.items[0].id, firstId);
  const system = await service.feed(userId, { category: "system", limit: 20 });
  assert.equal(system.items.length, 1);
  assert.equal(system.items[0].category, "system");
  assert.equal((await service.feed(otherUserId, { category: "all" })).items.length, 1);
});

test("Các loại sự kiện hiện có và nhắc lịch thuộc đúng tab", async () => {
  const expected = {
    message_received: "messages", missed_call: "messages",
    new_booking: "bookings", booking_confirmed: "bookings", booking_cancelled: "bookings",
    booking_updated: "bookings", booking_status_changed: "bookings",
    checkin_reminder: "bookings", checkout_reminder: "bookings",
    listing_approved: "listings", listing_rejected: "listings",
  };
  for (const [type, category] of Object.entries(expected)) {
    const Notification = { findAll: async ({ group }) => group ? [] : [{
      id: firstId, type, created_at: new Date(), toJSON: () => ({ id: firstId, type }),
    }] };
    const service = loadBackend("services/notification.service.js", { Notification, Sequelize }, {
      "services/chat.socket.js": {}, "services/notification-preference.service.js": {},
    });
    assert.equal((await service.feed(userId)).items[0].category, category);
  }
});

test("Không thể đọc thông báo của tài khoản khác và từ chối cursor sai", async () => {
  const { service } = fixture();
  await assert.rejects(() => service.markAsRead(otherUserId, firstId), { status: 404 });
  await assert.rejects(() => service.feed(userId, { cursor: "invalid", limit: 20 }), { status: 400 });
  await service.markAsRead(userId, firstId);
  assert.equal((await service.feed(userId)).meta.total_unread, 2);
});

test("Nhắc lịch chỉ tạo cho booking còn xác nhận, tôn trọng preference và không gửi trùng", async () => {
  const booking = { id: firstId, guest_id: userId, listing_id: thirdId,
    status: "confirmed", check_in: "2026-10-23", check_out: "2026-10-25" };
  const created = new Set();
  const models = {
    Booking: {
      findAll: async ({ where }) => where.status === "confirmed" ? [{ id: firstId }] : [],
      findByPk: async () => booking,
    },
    Listing: { findByPk: async () => ({ host_id: otherUserId, title: "Phòng thử nghiệm" }) },
    Notification: { findOrCreate: async ({ where }) => { created.add(`${where.user_id}:${where.dedupe_key}`); } },
    sequelize: { transaction: async (work) => work({ LOCK: { UPDATE: "UPDATE" } }) },
  };
  const reminders = loadBackend("services/notification-reminder.service.js", models, {
    "services/notification-preference.service.js": { allows: async (id) => id === userId },
  });
  await reminders.createReminders(new Date("2026-10-22T12:00:00Z"));
  await reminders.createReminders(new Date("2026-10-22T12:00:00Z"));
  assert.equal(created.size, 1);
  booking.status = "cancelled";
  created.clear();
  await reminders.createReminders(new Date("2026-10-22T12:00:00Z"));
  assert.equal(created.size, 0);
});
