const { Booking, Listing, ListingCalendarBlock, Sequelize, sequelize } = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const hostListings = require("./host_listing.service");
const pricing = require("./pricing.service");
const { bookingCode } = require("../transformers/booking.transformer");
const httpError = require("../utils/httpError");

const { Op } = Sequelize;
const bookingRepo = new BookingRepository();

/** Khoảng truy vấn và Host khóa lịch dùng [bắt đầu, kết thúc); booking giữ cả ngày trả phòng. */
function assertRange(startDate, endDate, maxDays = 550) {
  const valid = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(startDate) || !valid(endDate)) throw httpError(400, "Khoảng ngày không hợp lệ");
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000;
  if (days < 1 || days > maxDays) throw httpError(400, "Khoảng ngày không hợp lệ");
}

/** Truy vấn lịch kết thúc trước endDate, còn booking giữ trọn ngày trả phòng. */
function lastDateBefore(endDate) {
  return new Date(Date.parse(`${endDate}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}

/** API lịch công khai trả khoảng nửa mở để các client đánh dấu cả ngày trả phòng là bận. */
function dateAfter(date) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
}

function blockWhere(listingId, startDate, endDate) {
  return {
    listing_id: listingId,
    start_date: { [Op.lt]: endDate },
    end_date: { [Op.gt]: startDate },
  };
}

async function activeBookings(listingId, startDate, endDate, withGuest = false) {
  return Booking.findAll({
    where: bookingRepo.activeOverlapWhere({ listingId, check_in: startDate,
      check_out: lastDateBefore(endDate) }),
    attributes: withGuest ? ["id", "reference_number", "check_in", "check_out", "status", "created_at", "guests_count"] :
      ["check_in", "check_out", "status"],
    ...(withGuest ? { include: [
      { association: "guest", attributes: ["full_name"], required: false },
      { association: "bookingProposal", attributes: ["renter_name"], required: false },
    ] } : {}),
    order: [["check_in", "ASC"], ["id", "ASC"]],
  });
}

async function calendarRows(listingId, startDate, endDate, withGuest = false) {
  return Promise.all([
    activeBookings(listingId, startDate, endDate, withGuest),
    ListingCalendarBlock.findAll({
      where: blockWhere(listingId, startDate, endDate),
      attributes: withGuest ? ["id", "start_date", "end_date", "reason", "created_by"] : ["start_date", "end_date"],
      order: [["start_date", "ASC"]],
    }),
  ]);
}

module.exports = {
  async forHost(user, { listing_id, start_date, end_date }) {
    assertRange(start_date, end_date);
    const { listing } = await hostListings.getByIdForUser(user, listing_id, { include: [] });
    const [[bookings, blocks], prices] = await Promise.all([
      calendarRows(listing.id, start_date, end_date, true),
      pricing.forHost(user, { listing_id, start_date, end_date }),
    ]);
    return {
      listing: { id: listing.id, title: listing.title, status: listing.status,
        show_public_calendar: listing.show_public_calendar },
      start_date, end_date,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        booking_code: bookingCode(booking.reference_number),
        check_in: booking.check_in,
        check_out: booking.check_out,
        status: booking.status,
        guests_count: booking.guests_count,
        renter_name: booking.bookingProposal?.renter_name || booking.guest?.full_name || null,
        hold_expires_at: booking.status === "pending_payment" ? bookingRepo.holdExpiresAt(booking).toISOString() : null,
      })),
      blocks: blocks.map(({ id, start_date: start, end_date: end, reason }) => ({
        id, start_date: start, end_date: end, reason,
      })),
      pricing: prices,
    };
  },

  async publicAvailability(listingId, { start_date, end_date }) {
    assertRange(start_date, end_date);
    const listing = await Listing.findOne({
      where: { id: listingId, deleted_at: null, status: "published" }, attributes: ["id", "show_public_calendar"],
    });
    if (!listing) throw httpError(404, "Listing not found");
    const [bookings, blocks] = await calendarRows(listing.id, start_date, end_date);
    return {
      start_date, end_date,
      show_public_calendar: listing.show_public_calendar === true,
      intervals: [
        ...bookings.map((booking) => ({
          start_date: booking.check_in,
          end_date: dateAfter(booking.check_out),
          status: "unavailable",
        })),
        ...blocks.map((block) => ({
          start_date: block.start_date, end_date: block.end_date, status: "unavailable",
        })),
      ],
    };
  },

  /** Chủ phòng bật hoặc tắt lịch công khai mà không thay đổi trạng thái duyệt phòng. */
  async setPublicVisibility(user, { listing_id, visible }) {
    return sequelize.transaction(async (transaction) => {
      const { listing } = await hostListings.getByIdForUser(user, listing_id, {
        include: [], transaction, lock: transaction.LOCK.UPDATE,
      });
      if (visible && listing.status !== "published")
        throw httpError(409, "Listing must be published");
      await listing.update({ show_public_calendar: visible }, { transaction });
      return { listing_id: listing.id, show_public_calendar: listing.show_public_calendar };
    });
  },

  /** Khóa listing trước khi đọc booking và block để đồng bộ với luồng tạo/sửa booking. */
  async block(user, { listing_id, start_date, end_date, reason }) {
    assertRange(start_date, end_date, 365);
    if (start_date < new Date().toISOString().slice(0, 10))
      throw httpError(400, "Không thể khóa ngày đã qua");
    return sequelize.transaction(async (transaction) => {
      const { listing } = await hostListings.getByIdForUser(user, listing_id, {
        include: [], transaction, lock: transaction.LOCK.UPDATE,
      });
      if (await bookingRepo.findOverlappingBooking({
        listingId: listing.id, check_in: start_date, check_out: lastDateBefore(end_date),
      }, transaction)) throw httpError(409, "Khoảng ngày có booking hoặc giữ chỗ còn hiệu lực");
      if (await ListingCalendarBlock.findOne({
        where: blockWhere(listing.id, start_date, end_date), transaction,
      })) throw httpError(409, "Khoảng ngày đã được khóa");
      return ListingCalendarBlock.create({
        listing_id: listing.id, start_date, end_date,
        reason: reason?.trim() || null, created_by: user.id,
      }, { transaction });
    });
  },

  /** Mở một phần block phải giữ nguyên những ngày ở hai đầu còn bị khóa. */
  async unblock(user, { listing_id, start_date, end_date }) {
    assertRange(start_date, end_date, 365);
    return sequelize.transaction(async (transaction) => {
      const { listing } = await hostListings.getByIdForUser(user, listing_id, {
        include: [], transaction, lock: transaction.LOCK.UPDATE,
      });
      const blocks = await ListingCalendarBlock.findAll({
        where: blockWhere(listing.id, start_date, end_date),
        transaction, lock: transaction.LOCK.UPDATE,
      });
      for (const block of blocks) {
        await block.destroy({ transaction });
        const common = { listing_id: listing.id, reason: block.reason, created_by: block.created_by };
        if (block.start_date < start_date)
          await ListingCalendarBlock.create({ ...common, start_date: block.start_date, end_date: start_date }, { transaction });
        if (block.end_date > end_date)
          await ListingCalendarBlock.create({ ...common, start_date: end_date, end_date: block.end_date }, { transaction });
      }
      return { changed: blocks.length > 0 };
    });
  },
};
