// Tạo nhắc lịch một ngày trước ngày nhận hoặc trả phòng, dựa trên booking còn hiệu lực.
const { Op } = require("sequelize");
const { Booking, Listing, Notification, sequelize } = require("../models");
const preferences = require("./notification-preference.service");

function tomorrowUtc(now) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return date.toISOString().slice(0, 10);
}

/** Quét theo ID để không bỏ sót booking khi số lượng vượt quá một batch. */
async function createReminders(now = new Date()) {
  const day = tomorrowUtc(now);
  let lastId;
  for (;;) {
    const where = { status: "confirmed", [Op.or]: [{ check_in: day }, { check_out: day }] };
    if (lastId) where.id = { [Op.gt]: lastId };
    const bookings = await Booking.findAll({ where, attributes: ["id"], order: [["id", "ASC"]], limit: 100 });
    if (!bookings.length) break;
    for (const candidate of bookings) {
      await sequelize.transaction(async (transaction) => {
        const booking = await Booking.findByPk(candidate.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!booking || booking.status !== "confirmed") return;
        const listing = await Listing.findByPk(booking.listing_id, { attributes: ["host_id", "title"], transaction });
        if (!listing) return;
        for (const [dateField, type, title] of [
          ["check_in", "checkin_reminder", "Sắp đến ngày nhận phòng"],
          ["check_out", "checkout_reminder", "Sắp đến ngày trả phòng"],
        ]) {
          if (booking[dateField] !== day) continue;
          for (const userId of new Set([booking.guest_id, listing.host_id])) {
            if (!await preferences.allows(userId, "reminders", transaction)) continue;
            await Notification.findOrCreate({
              where: { user_id: userId, dedupe_key: `booking:${booking.id}:${type}:${day}` },
              defaults: {
                type, title, message: `Chỗ nghỉ "${listing.title}" có lịch ${type === "checkin_reminder" ? "nhận" : "trả"} phòng vào ngày ${day.split("-").reverse().join("/")}.`,
                resource_type: String(userId) === String(booking.guest_id) ? "booking" : "host_booking",
                resource_id: booking.id,
              },
              transaction,
            });
          }
        }
      });
    }
    lastId = bookings.at(-1).id;
    if (bookings.length < 100) break;
  }
}

module.exports = { createReminders };
