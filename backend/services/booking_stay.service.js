/** Điều phối QR nhận/trả phòng, trạng thái lưu trú và lịch sử thao tác trong một transaction. */
const crypto = require("node:crypto");
const { Booking, BookingStayEvent, BookingStayToken, Listing, Payment, Sequelize, sequelize } = require("../models");
const hostListings = require("./host_listing.service");
const notifications = require("./notification.service");
const { bookingCode, bookingReferenceFromCode } = require("../transformers/booking.transformer");
const { listingCode } = require("../transformers/listing.transformer");
const httpError = require("../utils/httpError");
const { isAdminRole } = require("../utils/roles");

const { Op } = Sequelize;
const TOKEN_MINUTES = 5;
// Ngày lưu trú theo giờ Việt Nam để mốc nửa đêm khớp với ngày nhận phòng hiển thị cho khách.
const stayDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
});
function tokenHash(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw httpError(410, "Stay QR is invalid, expired or already used");
  return crypto.createHash("sha256").update(token).digest("hex");
}

function assertTransition(booking, purpose) {
  const stayStatus = booking.stay_status || "not_checked_in";
  if (purpose === "check_in") {
    if (booking.status !== "confirmed" || stayStatus !== "not_checked_in")
      throw httpError(409, "Booking cannot be checked in");
    const today = stayDateFormatter.format(new Date());
    if (today < booking.check_in || today >= booking.check_out)
      throw httpError(409, "Check-in is outside the booked stay");
  } else if (purpose === "check_out") {
    if (!["confirmed", "completed"].includes(booking.status) || stayStatus !== "checked_in")
      throw httpError(409, "Booking cannot be checked out");
    if (stayDateFormatter.format(new Date()) < booking.check_out)
      throw httpError(409, "Check-out is before booked departure");
  } else throw httpError(400, "Invalid stay action");
}

function assertToken(token, purpose) {
  if (!token || token.purpose !== purpose || token.used_at || token.revoked_at ||
    new Date(token.expires_at).getTime() <= Date.now())
    throw httpError(410, "Stay QR is invalid, expired or already used");
}

function publicStayBooking(booking, paymentStatus = "unpaid") {
  return {
    id: booking.id, listing_id: booking.listing_id,
    booking_code: bookingCode(booking.reference_number),
    check_in: booking.check_in, check_out: booking.check_out,
    guests_count: booking.guests_count, stay_status: booking.stay_status || "not_checked_in",
    payment_method: booking.payment_method || "stripe", payment_status: paymentStatus,
    total_amount: booking.total_amount, currency: booking.currency,
    booked_at: booking.created_at,
    actual_check_in_at: booking.actual_check_in_at || null,
    actual_check_out_at: booking.actual_check_out_at || null,
    guest_name: booking.bookingProposal?.renter_name || booking.renter_name || null,
    guest_phone: booking.bookingProposal?.renter_phone || booking.renter_phone || null,
  };
}

/** Trạng thái tiền chỉ lấy từ payment đã ghi ở máy chủ, không lấy từ dữ liệu quét QR. */
async function paymentStatus(booking, transaction, lock = false) {
  const payment = await Payment.findOne({
    where: { booking_id: booking.id, provider: booking.payment_method || "stripe", status: "succeeded" },
    transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  return payment ? "paid" : "unpaid";
}

/** Host và booking cùng khóa theo thứ tự listing → booking để tương thích các mutation hiện có. */
async function hostListing(user, listingId, transaction) {
  const { listing } = await hostListings.getByIdForUser(user, listingId, {
    include: [], ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
  return listing;
}

async function recordTransition({ booking, listing, actorId, purpose, method, reason, token, transaction }) {
  const now = new Date();
  const checkedIn = purpose === "check_in";
  await booking.update(checkedIn ? {
    stay_status: "checked_in", actual_check_in_at: now, checked_in_by: actorId,
  } : {
    stay_status: "checked_out", actual_check_out_at: now, checked_out_by: actorId,
    status: "completed",
  }, { transaction });
  if (token) await token.update({ used_at: now }, { transaction });
  await BookingStayToken.update({ revoked_at: now }, {
    where: { booking_id: booking.id,
      purpose: checkedIn ? { [Op.in]: ["check_in", "verify"] } : purpose,
      used_at: null, revoked_at: null }, transaction,
  });
  const event = await BookingStayEvent.create({
    booking_id: booking.id, listing_id: listing.id, actor_id: actorId,
    action: checkedIn ? "checked_in" : "checked_out", method,
    reason: method === "manual" ? reason.trim() : null, token_id: token?.id || null,
  }, { transaction });
  await notifications.recordStayUpdate({ booking, listing, event, transaction });
  notifications.publishBookingChanged(transaction, booking, listing);
  return { ...publicStayBooking(booking, "paid"), event_id: event.id };
}

module.exports = {
  /** Guest chỉ nhận token sau khi trạng thái đặt phòng cho phép hành động tương ứng. */
  async issueQr({ guestId, bookingId, purpose }) {
    return sequelize.transaction(async (transaction) => {
      const booking = await Booking.findOne({
        where: { id: bookingId, guest_id: guestId }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!booking) throw httpError(404, "Booking not found");
      assertTransition(booking, purpose);
      const now = new Date();
      await BookingStayToken.update({ revoked_at: now }, {
        where: { booking_id: booking.id, purpose, used_at: null, revoked_at: null }, transaction,
      });
      const rawToken = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(now.getTime() + TOKEN_MINUTES * 60000);
      const token = await BookingStayToken.create({
        booking_id: booking.id, purpose, token_hash: tokenHash(rawToken), expires_at: expiresAt,
      }, { transaction });
      await BookingStayEvent.create({
        booking_id: booking.id, listing_id: booking.listing_id, actor_id: guestId,
        action: "qr_issued", method: "qr", token_id: token.id,
      }, { transaction });
      return { token: rawToken, purpose, expires_at: expiresAt.toISOString() };
    });
  },

  /** Mã quét tự xác định phòng; chỉ Host có quyền với phòng đó được xem thông tin booking. */
  async inspectQr({ user, rawToken }) {
    const token = await BookingStayToken.findOne({ where: { token_hash: tokenHash(rawToken) } });
    if (!token) throw httpError(410, "Stay QR is invalid, expired or already used");
    const booking = await Booking.findByPk(token.booking_id, {
      include: [
        { association: "bookingProposal", attributes: ["renter_name", "renter_phone"], required: false },
      ],
    });
    if (!booking) throw httpError(410, "Stay QR is invalid, expired or already used");
    const listing = await hostListing(user, booking.listing_id);
    if (token.used_at) return {
      purpose: token.purpose === "verify" ? "check_in" : token.purpose,
      listing: { id: listing.id, title: listing.title, listing_code: listingCode(listing.reference_number) },
      booking: publicStayBooking(booking, await paymentStatus(booking)), already_used: true,
      used_at: new Date(token.used_at).toISOString(),
    };
    assertToken(token, token.purpose);
    const purpose = token.purpose === "verify" ? "check_in" : token.purpose;
    // Cho phép xem thông tin trước ngày nhận hoặc trả phòng; ngày lưu trú chỉ được kiểm tra khi xác nhận.
    if (purpose === "check_in") {
      if (booking.status !== "confirmed" || (booking.stay_status || "not_checked_in") !== "not_checked_in")
        throw httpError(409, "Booking cannot be checked in");
    } else if (purpose === "check_out") {
      if (!["confirmed", "completed"].includes(booking.status) || booking.stay_status !== "checked_in")
        throw httpError(409, "Booking cannot be checked out");
    } else throw httpError(400, "Invalid stay action");
    return { purpose, listing: { id: listing.id, title: listing.title,
      listing_code: listingCode(listing.reference_number) },
      booking: publicStayBooking(booking, await paymentStatus(booking)),
      expires_at: new Date(token.expires_at).toISOString() };
  },

  /** Đọc phòng từ booking trước, rồi khóa phòng → booking để giữ cùng thứ tự với các thao tác lưu trú khác. */
  async confirmQr({ user, rawToken }) {
    return sequelize.transaction(async (transaction) => {
      const snapshot = await BookingStayToken.findOne({ where: { token_hash: tokenHash(rawToken) }, transaction });
      if (!snapshot) throw httpError(410, "Stay QR is invalid, expired or already used");
      const bookingSnapshot = await Booking.findByPk(snapshot.booking_id, { transaction,
        attributes: ["id", "listing_id"] });
      if (!bookingSnapshot) throw httpError(410, "Stay QR is invalid, expired or already used");
      const listing = await hostListing(user, bookingSnapshot.listing_id, transaction);
      const booking = await Booking.findByPk(snapshot.booking_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!booking || String(booking.listing_id) !== String(listing.id))
        throw httpError(409, "QR belongs to another listing");
      const token = await BookingStayToken.findByPk(snapshot.id, { transaction, lock: transaction.LOCK.UPDATE });
      assertToken(token, token?.purpose);
      const purpose = token.purpose === "verify" ? "check_in" : token.purpose;
      assertTransition(booking, purpose);
      if (purpose === "check_in" && await paymentStatus(booking, transaction, true) !== "paid")
        throw httpError(409, "Payment must be collected before check-in");
      return recordTransition({ booking, listing, actorId: user.id, purpose,
        method: "qr", token, transaction });
    });
  },

  async manual({ user, listingId, bookingId, purpose, reason }) {
    return sequelize.transaction(async (transaction) => {
      const listing = await hostListing(user, listingId, transaction);
      const booking = await Booking.findByPk(bookingId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!booking || String(booking.listing_id) !== String(listing.id)) throw httpError(404, "Booking not found");
      assertTransition(booking, purpose);
      if (purpose === "check_in" && await paymentStatus(booking, transaction, true) !== "paid")
        throw httpError(409, "Payment must be collected before check-in");
      return recordTransition({ booking, listing, actorId: user.id, purpose,
        method: "manual", reason, transaction });
    });
  },

  /** Mặc định lấy booking còn thao tác được của mọi phòng Host quản lý; phân trang để tránh tải quá nhiều. */
  async listForHost({ user, listingId, code, page = 1 }) {
    const listings = listingId ? [await hostListing(user, listingId)] : await Listing.findAll({
      where: { deleted_at: null, ...(!isAdminRole(user.role) ? { host_id: user.id } : {}) },
      attributes: ["id", "title", "reference_number"],
    });
    const reference = code ? bookingReferenceFromCode(code) : null;
    if (code && !reference) throw httpError(400, "Invalid booking code");
    const where = { listing_id: { [Op.in]: listings.map((listing) => listing.id) },
      status: { [Op.in]: ["confirmed", "completed"] },
      stay_status: { [Op.in]: ["not_checked_in", "checked_in"] } };
    if (reference) where.reference_number = reference;
    const limit = 100;
    const { rows: items, count } = await Booking.findAndCountAll({
      where,
      attributes: ["id", "listing_id", "reference_number", "check_in", "check_out", "guests_count", "stay_status", "payment_method",
        "renter_name", "renter_phone",
        "created_at", "total_amount", "currency", "actual_check_in_at", "actual_check_out_at"],
      include: [
        { association: "bookingProposal", attributes: ["renter_name", "renter_phone"], required: false },
      ],
      order: [["check_in", "DESC"], ["id", "DESC"]], limit, offset: (page - 1) * limit,
    });
    const paid = items.length ? await Payment.findAll({ where: {
      booking_id: { [Op.in]: items.map((booking) => booking.id) }, status: "succeeded",
    }, attributes: ["booking_id", "provider"] }) : [];
    const paidBookings = new Set(paid.map((payment) => `${payment.booking_id}:${payment.provider}`));
    const listingById = new Map(listings.map((listing) => [listing.id, listing]));
    return { items: items.map((booking) => {
      const listing = listingById.get(booking.listing_id);
      return { ...publicStayBooking(booking,
        paidBookings.has(`${booking.id}:${booking.payment_method || "stripe"}`) ? "paid" : "unpaid"),
      listing: listing && { id: listing.id, title: listing.title,
        listing_code: listingCode(listing.reference_number) } };
    }), meta: { page, total: count, total_pages: Math.ceil(count / limit) } };
  },

  async eventsForHost({ user, listingId, bookingId }) {
    const listing = await hostListing(user, listingId);
    const booking = await Booking.findByPk(bookingId, { attributes: ["id", "listing_id"] });
    if (!booking || String(booking.listing_id) !== String(listing.id)) throw httpError(404, "Booking not found");
    return BookingStayEvent.findAll({ where: { booking_id: bookingId },
      attributes: ["id", "action", "method", "reason", "actor_id", "created_at"],
      order: [["created_at", "ASC"], ["id", "ASC"]] });
  },
};
