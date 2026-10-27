const {
  Booking,
  Listing,
  Payment,
  User,
  Notification,
  BookingCancellation,
  BookingStayToken,
  sequelize,
} = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const { bookingCode } = require("../transformers/booking.transformer");
const { enqueue } = require("./background_job.service");
const notifications = require("./notification.service");
const preferences = require("./notification-preference.service");
const { message } = require("../templates/emails");
const { Op } = require("sequelize");
const httpError = require("../utils/httpError");
const bookingRepo = new BookingRepository();
const cancellationPolicy = require("./cancellation_policy");
const cancellations = require("./cancellation.service");
const pricing = require("./pricing.service");
const coupons = require("./coupon.service");

function daysBetween(checkIn, checkOut) {
  const valid = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (
    !valid(checkIn) ||
    !valid(checkOut) ||
    checkIn < new Date().toISOString().slice(0, 10)
  ) {
    throw httpError(400, "Invalid date range or past check-in");
  }
  const nights =
    (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) /
    86400000;
  if (nights <= 0) throw httpError(400, "Invalid date range");
  return nights;
}

function guestsForListing(value, listing) {
  const guests = Number(value ?? 1);
  if (!Number.isInteger(guests) || guests < 1 || guests > listing.max_guests)
    throw httpError(400, "Invalid guests_count");
  return guests;
}

async function cancelPendingPayments(bookingId, transaction) {
  const pending = await Payment.findAll({
    where: { booking_id: bookingId, status: "pending" },
    transaction,
  });
  for (const payment of pending) {
    await payment.update({ status: "cancelled" }, { transaction });
    if (payment.provider_txn_ref) {
      const intent = payment.provider_txn_ref.startsWith("pi_");
      await enqueue(intent ? "stripe_cancel_intent" : "stripe_expire_session",
        intent ? { intentId: payment.provider_txn_ref } : { sessionId: payment.provider_txn_ref }, transaction);
    }
  }
}

/** Dùng cùng phép kiểm tra lịch, sức chứa và giá cho đặt phòng thường lẫn đề xuất trong chat. */
async function quoteInTransaction({ listingId, check_in, check_out, guests_count }, transaction) {
  const nights = daysBetween(check_in, check_out);
  const listing = await Listing.findOne({
    where: { id: listingId, deleted_at: null, status: "published" },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!listing) throw httpError(404, "Listing not found");
  const guests = guestsForListing(guests_count, listing);
  await bookingRepo.assertAvailability({ listingId, check_in, check_out }, transaction);
  const price = await pricing.quoteListing(listing, check_in, check_out, transaction);
  return { listing, nights, guests, total: price.total, price };
}

module.exports = {
  quote(input, transaction) {
    return transaction ? quoteInTransaction(input, transaction) :
      sequelize.transaction((tx) => quoteInTransaction(input, tx));
  },
  /** Khóa listing từ trước bước kiểm tra lịch cho tới khi booking được ghi thành công. */
  async create({ userId, listingId, check_in, check_out, guests_count,
    transaction: existingTransaction, expectedPricePerNight, expectedTotal }) {
    const createInTransaction = async (transaction) => {
      const { listing, guests, total, price } = await quoteInTransaction(
        { listingId, check_in, check_out, guests_count }, transaction);
      if (String(listing.host_id) === String(userId))
        throw httpError(400, "Host cannot book own listing");
      if ((expectedPricePerNight !== undefined &&
        String(listing.price_per_night) !== String(expectedPricePerNight)) ||
        (expectedTotal !== undefined && total !== String(expectedTotal)))
        throw httpError(409, "PRICE_CHANGED");
      const renter = await User.findByPk(userId, {
        attributes: ["full_name", "phone"], transaction,
      });
      const booking = await Booking.create(
        {
          listing_id: listingId,
          guest_id: userId,
          renter_name: renter?.full_name || null,
          renter_phone: renter?.phone || null,
          check_in,
          check_out,
          guests_count: guests,
          status: "pending_payment",
          price_per_night_snapshot: listing.price_per_night,
          price_breakdown_snapshot: price,
          cancellation_policy_snapshot: cancellationPolicy.snapshot(listing.cancellation_policy_code),
          total_amount: total,
          currency: "VND",
        },
        { transaction },
      );
      return { booking, listing };
    };
    return existingTransaction ? createInTransaction(existingTransaction) :
      sequelize.transaction(createInTransaction);
  },

  async myBookings({ userId, page, limit }) {
    const paginated = page !== undefined || limit !== undefined;
    page ??= 1;
    limit ??= 50;
    const { rows, count } = await Booking.findAndCountAll({
      where: { guest_id: userId },
      include: bookingRepo.includeDetails(),
      distinct: true,
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
      ...(paginated ? { limit, offset: (page - 1) * limit } : {}),
    });
    return {
      items: rows,
      meta: {
        page,
        limit: paginated ? limit : count,
        total: count,
        total_pages: paginated ? Math.ceil(count / limit) : 1,
      },
    };
  },

  async detail({ userId, bookingId }) {
    const booking = await bookingRepo.findDetail(bookingId, userId);
    if (!booking) throw httpError(404, "Booking not found");
    return booking;
  },

  async checkout({ userId, bookingId }) {
    return sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(
        bookingId,
        transaction,
        userId,
      );
      if (booking.status !== "confirmed")
        throw httpError(409, "Booking is not confirmed");
      if (String(booking.check_out) > new Date().toISOString().slice(0, 10))
        throw httpError(400, "Stay has not ended yet");
      if (!(await bookingRepo.findPaid(booking.id, transaction)))
        throw httpError(400, "Booking is not paid");
      await booking.update({ status: "completed" }, { transaction });
      await notifications.recordBookingUpdate({ booking, listing, transaction, type: "booking_status_changed" });
      notifications.publishBookingChanged(transaction, booking, listing);
      return booking;
    });
  },

  async cancel({ userId, bookingId, expectedRefundAmount, reason }) {
    return sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(
        bookingId,
        transaction,
        userId,
      );
      if (booking.status === "cancelled") {
        const previous = await BookingCancellation.findOne({ where: { booking_id: booking.id }, transaction });
        if (previous) return { booking, cancellation: previous };
      }
      const quote = await cancellations.quoteForBooking(booking, transaction);
      if (expectedRefundAmount !== undefined && String(expectedRefundAmount) !== quote.refund_amount)
        throw httpError(409, "Cancellation quote changed. Review it again");
      const cancellation = await cancellations.record({ booking, userId, quoteResult: quote, reason, transaction });
      if (booking.status === "pending_payment") await coupons.releaseForBooking(booking, transaction);
      await booking.update({ status: "cancelled" }, { transaction });
      await BookingStayToken.update({ revoked_at: new Date() }, {
        where: { booking_id: booking.id, revoked_at: null }, transaction,
      });
      await notifications.recordBookingUpdate({ booking, listing, transaction,
        type: "booking_status_changed", recipientIds: [booking.guest_id] });
      notifications.publishBookingChanged(transaction, booking, listing);
      await cancelPendingPayments(booking.id, transaction);
      const host = await User.findByPk(listing.host_id, {
        attributes: ["email"],
        transaction,
      });
      if (await preferences.allows(listing.host_id, "bookings", transaction)) {
        await Notification.create(
          {
            user_id: listing.host_id,
            type: "booking_cancelled",
            title: "Một đơn đặt phòng đã bị hủy",
            message: `Đơn đặt phòng cho "${listing.title}" đã bị hủy.`,
            resource_type: "host_booking",
            resource_id: booking.id,
            dedupe_key: `booking:${booking.id}:cancelled`,
          },
          { transaction },
        );
      }
      if (host)
        await enqueue(
          "send_email",
          {
            to: host.email,
            subject: "Thông báo hủy đơn đặt phòng",
            html: message("Đơn đặt phòng đã bị hủy", [
              `Chỗ nghỉ: ${listing.title}`,
              `Mã đơn: ${bookingCode(booking.reference_number)}`,
              `Ngày nhận phòng: ${booking.check_in}`,
            ]),
          },
          transaction,
        );
      const guest = await User.findByPk(booking.guest_id, { attributes: ["email"], transaction });
      if (guest?.email) await enqueue("send_email", {
        to: guest.email, subject: "Xác nhận hủy đặt phòng",
        html: message("Đặt phòng đã được hủy", [
          `Mã đơn: ${bookingCode(booking.reference_number)}`,
          `Số tiền đã trả: ${quote.paid_amount} ${booking.currency}`,
          `Số tiền dự kiến hoàn: ${quote.refund_amount} ${booking.currency}`,
          `Phí không hoàn: ${quote.non_refundable_amount} ${booking.currency}`,
        ]),
      }, transaction);
      return { booking, cancellation };
    });
  },

  async update({ userId, bookingId, check_in, check_out, guests_count }) {
    await sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(
        bookingId,
        transaction,
        userId,
      );
      bookingRepo.assertPending(booking);
      if (listing.deleted_at || listing.status !== "published")
        throw httpError(409, "Listing is no longer available");
      const newCheckIn = check_in ?? booking.check_in;
      const newCheckOut = check_out ?? booking.check_out;
      daysBetween(newCheckIn, newCheckOut);
      const guests = guestsForListing(
        guests_count ?? booking.guests_count,
        listing,
      );
      await bookingRepo.assertAvailability(
        {
          listingId: listing.id,
          check_in: newCheckIn,
          check_out: newCheckOut,
          excludeBookingId: booking.id,
        },
        transaction,
      );
      const datesChanged = newCheckIn !== booking.check_in || newCheckOut !== booking.check_out;
      const price = datesChanged ? await coupons.repriceBooking(booking, listing,
        await pricing.quoteListing(listing, newCheckIn, newCheckOut, transaction), transaction) : null;
      await booking.update(
        {
          check_in: newCheckIn,
          check_out: newCheckOut,
          guests_count: guests,
          ...(price ? { price_per_night_snapshot: listing.price_per_night,
            price_breakdown_snapshot: price, total_amount: price.total } : {}),
        },
        { transaction },
      );
      await notifications.recordBookingUpdate({ booking, listing, transaction, type: "booking_updated" });
      notifications.publishBookingChanged(transaction, booking, listing);
      await cancelPendingPayments(booking.id, transaction);
    });
    return this.detail({ userId, bookingId });
  },

  async cleanupExpiredBookings() {
    const expired = await Booking.findAll({
      where: {
        status: "pending_payment",
        created_at: {
          [Op.lte]: new Date(
            Date.now() - Number(process.env.BOOKING_HOLD_MINUTES || 15) * 60000,
          ),
        },
      },
      attributes: ["id"],
      order: [
        ["created_at", "ASC"],
        ["id", "ASC"],
      ],
      limit: 100,
    });
    for (const snapshot of expired) {
      await sequelize.transaction(async (transaction) => {
        const { booking, listing } = await bookingRepo.lockForMutation(
          snapshot.id,
          transaction,
        );
        if (
          booking.status !== "pending_payment" ||
          bookingRepo.holdExpiresAt(booking) > new Date()
        )
          return;
        await coupons.releaseForBooking(booking, transaction);
        await booking.update({ status: "cancelled" }, { transaction });
        await notifications.recordBookingUpdate({ booking, listing, transaction, type: "booking_status_changed" });
        notifications.publishBookingChanged(transaction, booking, listing);
        await cancelPendingPayments(booking.id, transaction);
      });
    }
  },
};
