// Các thay đổi lịch đặt phòng khóa listing trước booking để tránh đặt trùng và giữ cùng thứ tự khóa.
const Repository = require("../core/repository");
const { Booking, Listing, Payment, Sequelize } = require("../models");
const httpError = require("../utils/httpError");
const { Op, literal } = Sequelize;
const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES || 15);
if (!Number.isFinite(HOLD_MINUTES) || HOLD_MINUTES <= 0) throw new Error("BOOKING_HOLD_MINUTES must be positive");

class BookingRepository extends Repository {
  getModel() { return Booking; }

  holdExpiresAt(booking) {
    return new Date(new Date(booking.created_at).getTime() + HOLD_MINUTES * 60000);
  }

  assertPending(booking) {
    if (booking.status !== "pending_payment") throw httpError(409, "Booking is not pending payment");
    if (this.holdExpiresAt(booking) <= new Date()) throw httpError(409, "Booking hold has expired");
  }

  async lockForMutation(bookingId, transaction, userId) {
    const snapshot = await Booking.findByPk(bookingId, { attributes: ["id", "listing_id", "guest_id"], transaction });
    if (!snapshot) throw httpError(404, "Booking not found");
    if (userId && String(snapshot.guest_id) !== String(userId)) throw httpError(403, "Forbidden");
    const listing = await Listing.findByPk(snapshot.listing_id, { transaction, lock: transaction.LOCK.UPDATE, paranoid: false });
    if (!listing) throw httpError(404, "Listing not found");
    const booking = await Booking.findByPk(bookingId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!booking) throw httpError(404, "Booking not found");
    return { booking, listing };
  }

  /** Listing phải được khóa trong cùng transaction trước khi kiểm tra khoảng ngày và ghi booking. */
  async assertAvailability({ listingId, check_in, check_out, excludeBookingId }, transaction) {
    const overlapping = await Booking.findOne({
      where: {
        listing_id: listingId,
        ...(excludeBookingId ? { id: { [Op.ne]: excludeBookingId } } : {}),
        [Op.or]: [
          { status: { [Op.in]: ["confirmed", "completed"] } },
          { status: "pending_payment", created_at: { [Op.gt]: new Date(Date.now() - HOLD_MINUTES * 60000) } },
        ],
        check_in: { [Op.lt]: check_out }, check_out: { [Op.gt]: check_in },
      }, transaction,
    });
    if (overlapping) throw httpError(409, "Dates are not available");
  }

  includeDetails() {
    return [
      { association: "listing", attributes: {
        include: [[literal('(SELECT li.url FROM listing_images li WHERE li.listing_id = "listing".id ORDER BY li.is_cover DESC, li.sort_order ASC LIMIT 1)'), "cover_url"]],
        exclude: ["deleted_at"],
      } },
      { association: "payments", attributes: ["id", "provider", "status", "amount", "currency", "provider_txn_ref", "provider_transaction_no", "paid_at", "created_at"], separate: true, order: [["created_at", "DESC"]] },
      { association: "review", attributes: ["id", "rating", "comment", "created_at"], required: false },
    ];
  }

  findDetail(bookingId, userId, options = {}) {
    return Booking.findOne({ where: { id: bookingId, guest_id: userId }, include: this.includeDetails(), ...options });
  }

  findPaid(bookingId, transaction) {
    return Payment.findOne({ where: { booking_id: bookingId, status: "succeeded", provider: "stripe" }, transaction });
  }
}

module.exports = BookingRepository;
