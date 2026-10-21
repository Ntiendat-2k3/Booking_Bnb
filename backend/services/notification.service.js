const { Notification } = require("../models");
const httpError = require("../utils/httpError");
const chatSocket = require("./chat.socket");
const preferences = require("./notification-preference.service");

module.exports = {
  list(userId) {
    return Notification.findAll({ where: { user_id: userId },
      attributes: ["id", "user_id", "type", "title", "message", "resource_type", "resource_id", "is_read", "created_at"],
      order: [["created_at", "DESC"]], limit: 50 });
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
};
