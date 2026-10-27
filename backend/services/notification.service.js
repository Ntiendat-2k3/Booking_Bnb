const { Notification, Sequelize } = require("../models");
const { Op } = Sequelize;
const httpError = require("../utils/httpError");
const chatSocket = require("./chat.socket");
const preferences = require("./notification-preference.service");

const TYPES_BY_CATEGORY = Object.freeze({
  messages: ["message_received", "missed_call"],
  bookings: ["new_booking", "booking_confirmed", "booking_cancelled", "booking_updated", "booking_status_changed",
    "checkin_reminder", "checkout_reminder", "stay_checked_in", "stay_checked_out",
    "refund_succeeded", "refund_failed"],
  listings: ["listing_approved", "listing_rejected"],
});
const KNOWN_TYPES = Object.values(TYPES_BY_CATEGORY).flat();
const categoryFor = (type) => Object.entries(TYPES_BY_CATEGORY)
  .find(([, types]) => types.includes(type))?.[0] || "system";
const attributes = ["id", "user_id", "type", "title", "message", "resource_type", "resource_id", "is_read", "created_at"];

function decodeCursor(cursor) {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const date = new Date(value.created_at);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== value.created_at ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)) {
      throw new Error("Invalid cursor");
    }
    return { date, id: value.id };
  } catch {
    throw httpError(400, "Invalid notification cursor");
  }
}

function categoryWhere(category) {
  if (category === "all") return {};
  return { type: category === "system" ? { [Op.notIn]: KNOWN_TYPES } : { [Op.in]: TYPES_BY_CATEGORY[category] } };
}

module.exports = {
  list(userId) {
    return Notification.findAll({ where: { user_id: userId },
      attributes,
      order: [["created_at", "DESC"]], limit: 50 });
  },
  /** Lấy một trang theo thứ tự ổn định và đếm unread trên toàn bộ dữ liệu của người dùng. */
  async feed(userId, { category = "all", limit = 20, cursor } = {}) {
    const decoded = decodeCursor(cursor);
    const where = { user_id: userId, ...categoryWhere(category) };
    if (decoded) where[Op.or] = [
      { created_at: { [Op.lt]: decoded.date } },
      { created_at: decoded.date, id: { [Op.lt]: decoded.id } },
    ];
    const [rows, unreadRows] = await Promise.all([
      Notification.findAll({ where, attributes, order: [["created_at", "DESC"], ["id", "DESC"]], limit: limit + 1 }),
      Notification.findAll({ where: { user_id: userId, is_read: false },
        attributes: ["type", [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]], group: ["type"], raw: true }),
    ]);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const unreadByCategory = { messages: 0, bookings: 0, listings: 0, system: 0 };
    for (const row of unreadRows) unreadByCategory[categoryFor(row.type)] += Number(row.count);
    const last = page.at(-1);
    return {
      items: page.map((row) => ({ ...row.toJSON(), category: categoryFor(row.type) })),
      meta: {
        next_cursor: hasMore && last ? Buffer.from(JSON.stringify({
          created_at: new Date(last.created_at).toISOString(), id: last.id,
        })).toString("base64url") : null,
        has_more: hasMore,
        total_unread: Object.values(unreadByCategory).reduce((sum, count) => sum + count, 0),
        unread_by_category: unreadByCategory,
      },
    };
  },
  async markAsRead(userId, id) {
    const notification = await Notification.findOne({ where: { id, user_id: userId } });
    if (!notification) throw httpError(404, "Notification not found");
    return notification.update({ is_read: true });
  },
  markAllAsRead(userId) {
    return Notification.update({ is_read: true }, { where: { user_id: userId, is_read: false } });
  },
  /** Chỉ báo thay đổi sau commit; client tải lại card từ booking domain thay vì tin payload socket. */
  publishBookingChanged(transaction, booking, listing) {
    if (typeof transaction.afterCommit !== "function") return;
    const recipients = [booking.guest_id, listing.host_id];
    transaction.afterCommit(() => chatSocket.emitToUsers(recipients, "booking:status", {
      booking_id: booking.id,
    }));
  },
  /** Notification được ghi trong transaction booking và dùng cùng revision để retry không nhân đôi. */
  async recordBookingUpdate({ booking, listing, transaction, type, recipientIds }) {
    const revision = booking.updated_at ? new Date(booking.updated_at).getTime() : Date.now();
    const dedupeKey = `booking:${booking.id}:${type}:${revision}`;
    for (const userId of new Set(recipientIds || [booking.guest_id, listing.host_id])) {
      if (!await preferences.allows(userId, "bookings", transaction)) continue;
      await Notification.findOrCreate({
        where: { user_id: userId, dedupe_key: dedupeKey },
        defaults: {
          type,
          title: "Đặt phòng đã cập nhật",
          message: "Thông tin đặt phòng của bạn đã thay đổi.",
          resource_type: String(userId) === String(booking.guest_id) ? "booking" : "host_booking",
          resource_id: booking.id,
        },
        transaction,
      });
    }
  },
  /** Một sự kiện lưu trú tạo thông báo riêng cho Guest và Host trong cùng transaction. */
  async recordStayUpdate({ booking, listing, event, transaction }) {
    const checkedIn = event.action === "checked_in";
    for (const userId of new Set([booking.guest_id, listing.host_id])) {
      if (!await preferences.allows(userId, "bookings", transaction)) continue;
      await Notification.findOrCreate({
        where: { user_id: userId, dedupe_key: `stay:${event.id}:${userId}` },
        defaults: {
          type: checkedIn ? "stay_checked_in" : "stay_checked_out",
          title: checkedIn ? "Đã nhận phòng" : "Đã trả phòng",
          message: checkedIn ? `Khách đã nhận phòng tại "${listing.title}".` :
            `Khách đã trả phòng tại "${listing.title}".`,
          resource_type: String(userId) === String(booking.guest_id) ? "booking" : "host_stay",
          resource_id: String(userId) === String(booking.guest_id) ? booking.id : listing.id,
        },
        transaction,
      });
    }
  },
};
