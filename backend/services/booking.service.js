const { Booking, Listing, Payment, User, Notification, sequelize } = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const { enqueue } = require("./background_job.service");
const { message } = require("../templates/emails");
const { Op } = require("sequelize");
const httpError = require("../utils/httpError");
const bookingRepo = new BookingRepository();

function daysBetween(checkIn, checkOut) {
  const valid = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(checkIn) || !valid(checkOut) || checkIn < new Date().toISOString().slice(0, 10)) {
    throw httpError(400, "Invalid date range or past check-in");
  }
  const nights = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000;
  if (nights <= 0) throw httpError(400, "Invalid date range");
  return nights;
}

function guestsForListing(value, listing) {
  const guests = Number(value ?? 1);
  if (!Number.isInteger(guests) || guests < 1 || guests > listing.max_guests) throw httpError(400, "Invalid guests_count");
  return guests;
}

function withReviewFlag(booking) {
  const plain = booking.toJSON();
  plain.can_review = !plain.review && ["confirmed", "completed"].includes(plain.status)
    && String(plain.check_out) <= new Date().toISOString().slice(0, 10);
  return plain;
}

async function cancelPendingPayments(bookingId, transaction) {
  const pending = await Payment.findAll({ where: { booking_id: bookingId, status: "pending" }, transaction });
  for (const payment of pending) {
    await payment.update({ status: "cancelled" }, { transaction });
    if (payment.provider_txn_ref) await enqueue("stripe_expire_session", { sessionId: payment.provider_txn_ref }, transaction);
  }
}

module.exports = {
  /** Khóa listing từ trước bước kiểm tra lịch cho tới khi booking được ghi thành công. */
  async create({ userId, listingId, check_in, check_out, guests_count }) {
    const nights = daysBetween(check_in, check_out);
    return sequelize.transaction(async (transaction) => {
      const listing = await Listing.findOne({
        where: { id: listingId, deleted_at: null, status: "published" }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!listing) throw httpError(404, "Listing not found");
      if (String(listing.host_id) === String(userId)) throw httpError(400, "Host cannot book own listing");
      const guests = guestsForListing(guests_count, listing);
      await bookingRepo.assertAvailability({ listingId, check_in, check_out }, transaction);
      const total = BigInt(listing.price_per_night) * BigInt(nights);
      if (total <= 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) throw httpError(400, "Invalid booking amount");
      const booking = await Booking.create({
        listing_id: listingId, guest_id: userId, check_in, check_out, guests_count: guests,
        status: "pending_payment", price_per_night_snapshot: listing.price_per_night,
        total_amount: total.toString(), currency: "VND",
      }, { transaction });
      return { booking, listing };
    });
  },

  async myBookings({ userId, page, limit }) {
    const paginated = page !== undefined || limit !== undefined;
    page ??= 1;
    limit ??= 50;
    const { rows, count } = await Booking.findAndCountAll({
      where: { guest_id: userId }, include: bookingRepo.includeDetails(), distinct: true,
      order: [["created_at", "DESC"], ["id", "DESC"]], ...(paginated ? { limit, offset: (page - 1) * limit } : {}),
    });
    return { items: rows.map(withReviewFlag), meta: { page, limit: paginated ? limit : count, total: count, total_pages: paginated ? Math.ceil(count / limit) : 1 } };
  },

  async detail({ userId, bookingId }) {
    const booking = await bookingRepo.findDetail(bookingId, userId);
    if (!booking) throw httpError(404, "Booking not found");
    return withReviewFlag(booking);
  },

  async checkout({ userId, bookingId }) {
    return sequelize.transaction(async (transaction) => {
      const { booking } = await bookingRepo.lockForMutation(bookingId, transaction, userId);
      if (booking.status !== "confirmed") throw httpError(409, "Booking is not confirmed");
      if (String(booking.check_out) > new Date().toISOString().slice(0, 10)) throw httpError(400, "Stay has not ended yet");
      if (!await bookingRepo.findPaid(booking.id, transaction)) throw httpError(400, "Booking is not paid");
      return booking.update({ status: "completed" }, { transaction });
    });
  },

  async cancel({ userId, bookingId }) {
    return sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(bookingId, transaction, userId);
      if (!["pending_payment", "confirmed"].includes(booking.status)) throw httpError(409, "Booking cannot be cancelled");
      if (booking.status === "confirmed" && booking.check_in <= new Date().toISOString().slice(0, 10)) throw httpError(400, "Too late to cancel");
      await booking.update({ status: "cancelled" }, { transaction });
      await cancelPendingPayments(booking.id, transaction);
      const host = await User.findByPk(listing.host_id, { attributes: ["email"], transaction });
      await Notification.create({ user_id: listing.host_id, type: "booking_cancelled", title: "Một đơn đặt phòng đã bị hủy", message: `Đơn đặt phòng cho "${listing.title}" đã bị hủy.` }, { transaction });
      if (host) await enqueue("send_email", { to: host.email, subject: "Thông báo hủy đơn đặt phòng", html: message("Đơn đặt phòng đã bị hủy", [`Chỗ nghỉ: ${listing.title}`, `Mã đơn: ${booking.id}`, `Ngày nhận phòng: ${booking.check_in}`]) }, transaction);
      return booking;
    });
  },

  async update({ userId, bookingId, check_in, check_out, guests_count }) {
    await sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(bookingId, transaction, userId);
      bookingRepo.assertPending(booking);
      if (listing.deleted_at || listing.status !== "published") throw httpError(409, "Listing is no longer available");
      const newCheckIn = check_in ?? booking.check_in;
      const newCheckOut = check_out ?? booking.check_out;
      const nights = daysBetween(newCheckIn, newCheckOut);
      const guests = guestsForListing(guests_count ?? booking.guests_count, listing);
      await bookingRepo.assertAvailability({ listingId: listing.id, check_in: newCheckIn, check_out: newCheckOut, excludeBookingId: booking.id }, transaction);
      const total = BigInt(booking.price_per_night_snapshot) * BigInt(nights);
      if (total <= 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) throw httpError(400, "Invalid booking amount");
      await booking.update({ check_in: newCheckIn, check_out: newCheckOut, guests_count: guests, total_amount: total.toString() }, { transaction });
      await cancelPendingPayments(booking.id, transaction);
    });
    return this.detail({ userId, bookingId });
  },

  async cleanupExpiredBookings() {
    const expired = await Booking.findAll({
      where: { status: "pending_payment", created_at: { [Op.lte]: new Date(Date.now() - Number(process.env.BOOKING_HOLD_MINUTES || 15) * 60000) } },
      attributes: ["id"], order: [["created_at", "ASC"], ["id", "ASC"]], limit: 100,
    });
    for (const snapshot of expired) {
      await sequelize.transaction(async (transaction) => {
        const { booking } = await bookingRepo.lockForMutation(snapshot.id, transaction);
        if (booking.status !== "pending_payment" || bookingRepo.holdExpiresAt(booking) > new Date()) return;
        await booking.update({ status: "cancelled" }, { transaction });
        await cancelPendingPayments(booking.id, transaction);
      });
    }
  },
};
