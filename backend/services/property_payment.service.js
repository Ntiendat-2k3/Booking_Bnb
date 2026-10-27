/** Xác nhận trả tại cơ sở, ghi nhận tiền thực thu và đối soát độc lập với Stripe. */
const { Booking, Payment, PaymentCollection, BookingStayEvent, BookingStayToken, User, sequelize } = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const hostListings = require("./host_listing.service");
const { enqueue } = require("./background_job.service");
const notifications = require("./notification.service");
const { message } = require("../templates/emails");
const { bookingCode } = require("../transformers/booking.transformer");
const { paymentCode } = require("../transformers/payment.transformer");
const bookingQr = require("./booking_qr.service");
const coupons = require("./coupon.service");
const httpError = require("../utils/httpError");
const { Op } = require("sequelize");

const bookingRepo = new BookingRepository();
const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
});

async function authorizedListing(user, listingId, transaction) {
  const { listing } = await hostListings.getByIdForUser(user, listingId, {
    include: [], transaction, lock: transaction.LOCK.UPDATE,
  });
  return listing;
}

module.exports = {
  /** Chỉ chuyển hold chưa thanh toán; khóa listing và booking theo cùng thứ tự các mutation hiện có. */
  async confirm({ bookingId, userId }) {
    return sequelize.transaction(async (transaction) => {
      const { booking, listing } = await bookingRepo.lockForMutation(bookingId, transaction, userId);
      bookingRepo.assertPending(booking);
      if (listing.status !== "published" || listing.deleted_at)
        throw httpError(409, "Pay at property is unavailable");
      const succeeded = await Payment.findOne({ where: { booking_id: booking.id, status: "succeeded" }, transaction });
      if (succeeded) throw httpError(409, "Booking already has a payment");
      const pendingStripe = await Payment.findAll({
        where: { booking_id: booking.id, provider: "stripe", status: "pending" }, transaction,
        lock: transaction.LOCK.UPDATE,
      });
      for (const payment of pendingStripe) {
        await payment.update({ status: "cancelled" }, { transaction });
        if (payment.provider_txn_ref) await enqueue(
          payment.provider_txn_ref.startsWith("pi_") ? "stripe_cancel_intent" : "stripe_expire_session",
          payment.provider_txn_ref.startsWith("pi_")
            ? { intentId: payment.provider_txn_ref } : { sessionId: payment.provider_txn_ref }, transaction);
      }
      const payment = await Payment.create({ booking_id: booking.id, provider: "property",
        status: "pending", amount: booking.total_amount, currency: booking.currency }, { transaction });
      await coupons.confirmForBooking(booking, transaction);
      await booking.update({ status: "confirmed", payment_method: "property" }, { transaction });
      notifications.publishBookingChanged(transaction, booking, listing);
      await notifications.recordBookingUpdate({ booking, listing, transaction, type: "booking_status_changed" });
      const [guest, host] = await Promise.all([
        User.findByPk(booking.guest_id, { attributes: ["email"], transaction }),
        User.findByPk(listing.host_id, { attributes: ["email"], transaction }),
      ]);
      if (guest?.email) await bookingQr.queueConfirmation(booking, transaction);
      if (host?.email) await enqueue("send_email", { to: host.email,
        subject: "Có đơn đặt phòng trả tại cơ sở",
        html: message("Có đơn đặt phòng mới", [
          `Mã đơn: ${bookingCode(booking.reference_number)}`,
          `Ngày nhận phòng: ${booking.check_in}`,
          `Cần thu: ${booking.total_amount} ${booking.currency}`,
        ]),
      }, transaction);
      return { booking, payment };
    });
  },

  /** Ghi đúng số tiền Host xác nhận đã thu; payment và biên nhận commit cùng nhau để tránh thu trùng. */
  async collect({ user, listingId, bookingId, method, amount }) {
    if (!["cash", "bank_transfer"].includes(method) ||
        typeof amount !== "string" || !/^[1-9]\d*$/.test(amount) ||
        BigInt(amount) > 9223372036854775807n)
      throw httpError(400, "A valid collected amount and method are required");
    return sequelize.transaction(async (transaction) => {
      const listing = await authorizedListing(user, listingId, transaction);
      const booking = await Booking.findByPk(bookingId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!booking || String(booking.listing_id) !== String(listing.id)) throw httpError(404, "Booking not found");
      if (booking.payment_method !== "property" || booking.status !== "confirmed" ||
          booking.stay_status === "no_show") throw httpError(409, "Booking cannot be collected");
      const payment = await Payment.findOne({ where: { booking_id: booking.id, provider: "property" },
        transaction, lock: transaction.LOCK.UPDATE });
      if (!payment || payment.status !== "pending") throw httpError(409, "Payment was already collected");
      // Mã thu tiền dùng chung mã giao dịch đã được database cấp khi xác nhận booking.
      const receiptCode = paymentCode(payment.reference_number);
      if (!receiptCode) throw new Error("Property payment is missing its reference number");
      const now = new Date();
      const collection = await PaymentCollection.create({ booking_id: booking.id,
        payment_id: payment.id, amount, currency: booking.currency,
        method, external_ref: receiptCode, collected_by: user.id, collected_at: now }, { transaction });
      await payment.update({ status: "succeeded", amount, paid_at: now }, { transaction });
      notifications.publishBookingChanged(transaction, booking, listing);
      return { collection, payment_status: "paid" };
    });
  },

  /** Host xem công nợ và khoản đã thu; khoản chờ đối soát luôn giữ người thu và chứng từ. */
  async report({ user, listingId, page = 1 }) {
    const { listing } = await hostListings.getByIdForUser(user, listingId, { include: [] });
    const limit = 50;
    const { rows: bookings, count } = await Booking.findAndCountAll({
      where: { listing_id: listing.id, payment_method: "property" },
      attributes: ["id", "reference_number", "status", "stay_status", "check_in", "total_amount", "currency"],
      order: [["check_in", "DESC"], ["id", "DESC"]], limit, offset: (page - 1) * limit });
    const collections = bookings.length ? await PaymentCollection.findAll({
      where: { booking_id: { [Op.in]: bookings.map((booking) => booking.id) } },
      attributes: ["id", "booking_id", "amount", "currency", "method", "external_ref", "collected_by",
        "collected_at", "reconciled_by", "reconciled_at"],
    }) : [];
    const collectionByBooking = new Map(collections.map((row) => [row.booking_id, row]));
    const items = [];
    let outstanding = 0n;
    let collected = 0n;
    let awaitingReconciliation = 0n;
    for (const booking of bookings) {
      const collection = collectionByBooking.get(booking.id) || null;
      items.push({ booking_id: booking.id, booking_code: bookingCode(booking.reference_number),
        booking_status: booking.status, stay_status: booking.stay_status, check_in: booking.check_in,
        amount: booking.total_amount, currency: booking.currency, collection });
      if (collection) {
        collected += BigInt(collection.amount);
        if (!collection.reconciled_at) awaitingReconciliation += BigInt(collection.amount);
      } else if (booking.status === "confirmed") outstanding += BigInt(booking.total_amount);
    }
    return { items, meta: { page, total: count, total_pages: Math.ceil(count / limit) },
      totals: { outstanding: outstanding.toString(),
      collected: collected.toString(), awaiting_reconciliation: awaitingReconciliation.toString() } };
  },

  async reconcile({ user, collectionId }) {
    if (user.role !== "admin" && user.role !== "super_admin") throw httpError(403, "Forbidden");
    return sequelize.transaction(async (transaction) => {
      const collection = await PaymentCollection.findByPk(collectionId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!collection) throw httpError(404, "Collection not found");
      if (collection.reconciled_at) return collection;
      await collection.update({ reconciled_by: user.id, reconciled_at: new Date() }, { transaction });
      return collection;
    });
  },

  /** Chỉ đánh dấu không đến sau ngày nhận phòng, khi chưa có check-in hoặc khoản đã thu. */
  async noShow({ user, listingId, bookingId, reason }) {
    return sequelize.transaction(async (transaction) => {
      const listing = await authorizedListing(user, listingId, transaction);
      const booking = await Booking.findByPk(bookingId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!booking || String(booking.listing_id) !== String(listing.id)) throw httpError(404, "Booking not found");
      if (booking.payment_method !== "property" || booking.status !== "confirmed" ||
          booking.stay_status !== "not_checked_in" || localDate.format(new Date()) <= booking.check_in)
        throw httpError(409, "Booking cannot be marked no-show");
      const payment = await Payment.findOne({ where: { booking_id: booking.id, provider: "property" },
        transaction, lock: transaction.LOCK.UPDATE });
      if (!payment || payment.status !== "pending") throw httpError(409, "Collected booking cannot be no-show");
      await payment.update({ status: "cancelled" }, { transaction });
      await booking.update({ status: "cancelled", stay_status: "no_show" }, { transaction });
      await BookingStayToken.update({ revoked_at: new Date() }, {
        where: { booking_id: booking.id, revoked_at: null }, transaction,
      });
      await BookingStayEvent.create({ booking_id: booking.id, listing_id: listing.id,
        actor_id: user.id, action: "no_show", method: "manual", reason }, { transaction });
      await notifications.recordBookingUpdate({ booking, listing, transaction,
        type: "booking_status_changed", recipientIds: [booking.guest_id] });
      const guest = await User.findByPk(booking.guest_id, { attributes: ["email"], transaction });
      if (guest?.email) await enqueue("send_email", { to: guest.email,
        subject: "Thông báo khách không đến",
        html: message("Đơn đặt phòng được ghi nhận không đến", [
          `Mã đơn: ${bookingCode(booking.reference_number)}`,
          `Chỗ nghỉ: ${listing.title}`,
          `Lý do: ${reason}`,
          "Đơn chưa được thu tiền tại cơ sở và đã được hủy.",
        ]),
      }, transaction);
      notifications.publishBookingChanged(transaction, booking, listing);
      return { booking_id: booking.id, stay_status: "no_show" };
    });
  },
};
