/** Quản lý hạn mức voucher cùng transaction của booking và thanh toán. */
const { Coupon, CouponRedemption, Booking, Payment, Listing, User, Notification,
  Favorite, sequelize, Sequelize } = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const { enqueue } = require("./background_job.service");
const preferences = require("./notification-preference.service");
const httpError = require("../utils/httpError");
const { Op } = Sequelize;
const bookingRepo = new BookingRepository();

function baseSnapshot(booking) {
  const previous = booking.price_breakdown_snapshot;
  const subtotal = String(previous?.subtotal ?? booking.total_amount);
  const fees = String(previous?.fees ?? 0);
  return { ...(previous || { check_in: booking.check_in, check_out: booking.check_out,
    nights: [], currency: booking.currency }), subtotal, fees, discount: "0",
    total: (BigInt(subtotal) + BigInt(fees)).toString(), coupon: null };
}

function discountedSnapshot(base, coupon) {
  const subtotal = BigInt(base.subtotal);
  let discount = coupon.discount_type === "percent"
    ? subtotal * BigInt(coupon.discount_value) / 100n : BigInt(coupon.discount_value);
  if (coupon.max_discount != null && discount > BigInt(coupon.max_discount))
    discount = BigInt(coupon.max_discount);
  if (discount > subtotal) discount = subtotal;
  if (discount <= 0n || BigInt(base.total) - discount <= 0n)
    throw httpError(422, "COUPON_ZERO_TOTAL");
  return { ...base, discount: discount.toString(),
    total: (BigInt(base.total) - discount).toString(),
    coupon: { id: coupon.id, code: coupon.code, campaign_name: coupon.campaign_name } };
}

/** Điều kiện được kiểm tra lại khi giữ mã, kể cả sau khi khách đổi ngày thuê. */
async function hasPaidBefore(userId, transaction) {
  const bookings = await Booking.findAll({ where: { guest_id: userId }, attributes: ["id", "status"], transaction });
  if (bookings.some((item) => ["confirmed", "completed"].includes(item.status))) return true;
  if (!bookings.length) return false;
  return (await Payment.count({ where: { booking_id: { [Op.in]: bookings.map((item) => item.id) },
    status: { [Op.in]: ["succeeded", "refunded"] } }, transaction })) > 0;
}

async function validate(coupon, booking, listing, subtotal, transaction, previous) {
  const now = new Date();
  if (!coupon?.is_active) throw httpError(422, "COUPON_INVALID");
  if (now < new Date(coupon.starts_at)) throw httpError(422, "COUPON_NOT_STARTED");
  if (now >= new Date(coupon.ends_at)) throw httpError(422, "COUPON_EXPIRED");
  if (coupon.listing_id && String(coupon.listing_id) !== String(listing.id) ||
    coupon.host_id && String(coupon.host_id) !== String(listing.host_id) ||
    coupon.city && coupon.city.toLocaleLowerCase("vi") !== String(listing.city || "").toLocaleLowerCase("vi"))
    throw httpError(422, "COUPON_NOT_APPLICABLE");
  if (BigInt(subtotal) < BigInt(coupon.min_subtotal))
    throw httpError(422, "COUPON_MIN_SPEND");
  const sameReservation = previous?.status === "reserved" &&
    String(previous.coupon_id) === String(coupon.id);
  if (coupon.max_total_uses != null && Number(coupon.active_uses) - Number(sameReservation) >= coupon.max_total_uses)
    throw httpError(422, "COUPON_EXHAUSTED");
  const perUserLimit = coupon.audience === "new_guest" ? 1 : coupon.max_uses_per_user;
  if (perUserLimit != null) {
    const count = await CouponRedemption.count({ where: { coupon_id: coupon.id,
      user_id: booking.guest_id, status: { [Op.in]: ["reserved", "redeemed"] } }, transaction });
    if (count - Number(sameReservation) >= perUserLimit)
      throw httpError(422, "COUPON_USER_LIMIT");
  }
  if (coupon.audience === "new_guest") {
    if (await hasPaidBefore(booking.guest_id, transaction))
      throw httpError(422, "COUPON_NEW_GUEST_ONLY");
  }
  if (coupon.audience === "returning_guest" && !await hasPaidBefore(booking.guest_id, transaction))
    throw httpError(422, "COUPON_RETURNING_GUEST_ONLY");
}

async function releaseReservation(redemption, transaction) {
  if (!redemption || redemption.status !== "reserved") return;
  const coupon = await Coupon.findByPk(redemption.coupon_id,
    { transaction, lock: transaction.LOCK.UPDATE });
  await redemption.update({ status: "released" }, { transaction });
  await coupon.decrement("active_uses", { by: 1, transaction });
}

async function apply({ bookingId, userId, code }) {
  return sequelize.transaction(async (transaction) => {
    const { booking, listing } = await bookingRepo.lockForMutation(bookingId, transaction, userId);
    bookingRepo.assertPending(booking);
    const previous = await CouponRedemption.findOne({ where: { booking_id: bookingId }, transaction });
    const normalized = code?.trim().toUpperCase() || "";
    const coupon = normalized ? await Coupon.findOne({ where: { code: normalized }, transaction }) : null;
    if (normalized && !coupon) throw httpError(422, "COUPON_INVALID");
    const base = baseSnapshot(booking);
    if (coupon) {
      // Khóa các mã theo cùng thứ tự để hai booking đổi mã không gây deadlock.
      const couponIds = [...new Set([coupon.id,
        ...(previous?.status === "reserved" ? [previous.coupon_id] : [])])].sort();
      const lockedCoupons = await Coupon.findAll({ where: { id: { [Op.in]: couponIds } },
        order: [["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
      const locked = lockedCoupons.find((item) => String(item.id) === String(coupon.id));
      await validate(locked, booking, listing, base.subtotal, transaction, previous);
      const quote = discountedSnapshot(base, locked);
      if (previous?.status === "reserved" && String(previous.coupon_id) !== String(locked.id)) {
        await previous.update({ status: "released" }, { transaction });
        const old = lockedCoupons.find((item) => String(item.id) === String(previous.coupon_id));
        await old.decrement("active_uses", { by: 1, transaction });
      }
      if (!previous || previous.status !== "reserved" || String(previous.coupon_id) !== String(locked.id))
        await locked.increment("active_uses", { by: 1, transaction });
      if (previous) await previous.update({ coupon_id: locked.id, status: "reserved",
        subtotal_snapshot: base.subtotal, discount_amount: quote.discount, redeemed_at: null }, { transaction });
      else await CouponRedemption.create({ coupon_id: locked.id, booking_id: booking.id,
        user_id: booking.guest_id, status: "reserved", subtotal_snapshot: base.subtotal,
        discount_amount: quote.discount }, { transaction });
      await booking.update({ price_breakdown_snapshot: quote, total_amount: quote.total }, { transaction });
    } else {
      await releaseReservation(previous, transaction);
      await booking.update({ price_breakdown_snapshot: base, total_amount: base.total }, { transaction });
    }
    return booking;
  });
}

/** Chỉ trả slot của booking chưa thanh toán; voucher đã thanh toán vẫn được tính đã dùng. */
async function releaseForBooking(booking, transaction) {
  const redemption = await CouponRedemption.findOne({ where: { booking_id: booking.id }, transaction });
  await releaseReservation(redemption, transaction);
}

async function confirmForBooking(booking, transaction) {
  const redemption = await CouponRedemption.findOne({ where: { booking_id: booking.id }, transaction });
  if (redemption?.status === "reserved")
    await redemption.update({ status: "redeemed", redeemed_at: new Date() }, { transaction });
}

async function repriceBooking(booking, listing, price, transaction) {
  const previous = await CouponRedemption.findOne({ where: { booking_id: booking.id }, transaction });
  if (previous?.status !== "reserved") return price;
  const coupon = await Coupon.findByPk(previous.coupon_id,
    { transaction, lock: transaction.LOCK.UPDATE });
  try {
    await validate(coupon, booking, listing, price.subtotal, transaction, previous);
    const result = discountedSnapshot(price, coupon);
    await previous.update({ subtotal_snapshot: price.subtotal,
      discount_amount: result.discount }, { transaction });
    return result;
  } catch (error) {
    if (error.status !== 422) throw error;
    await releaseReservation(previous, transaction);
    return price;
  }
}

async function create(data, actor) {
  const code = data.code.trim().toUpperCase();
  try {
    return await sequelize.transaction(async (transaction) => {
      const duplicate = await Coupon.findOne({ where: { code }, transaction });
      if (duplicate) throw httpError(409, "COUPON_CODE_EXISTS");
      if (data.listing_id) {
        const listing = await Listing.findByPk(data.listing_id, { transaction });
        if (!listing) throw httpError(404, "Listing not found");
        if (data.host_id && String(data.host_id) !== String(listing.host_id))
          throw httpError(422, "COUPON_NOT_APPLICABLE");
      }
      if (data.host_id) {
        const host = await User.findByPk(data.host_id, { attributes: ["role"], transaction });
        if (!host || !["host", "admin", "super_admin"].includes(host.role))
          throw httpError(422, "COUPON_NOT_APPLICABLE");
      }
      const created = await Coupon.create({ ...data, code, created_by: actor.id, active_uses: 0 }, { transaction });
      if (data.notify_users) await enqueue("promotion_notify", { couponId: created.id }, transaction);
      return created;
    });
  } catch (error) {
    if (error instanceof Sequelize.UniqueConstraintError) throw httpError(409, "COUPON_CODE_EXISTS");
    throw error;
  }
}

async function setActive(id, active) {
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw httpError(404, "COUPON_INVALID");
  await coupon.update({ is_active: active });
  return coupon;
}

async function report() {
  const rows = await sequelize.query(`SELECT c.id, c.code, c.campaign_name, c.discount_type,
    c.discount_value, c.starts_at, c.ends_at, c.is_active, c.active_uses,
    COUNT(r.id) FILTER (WHERE r.status = 'reserved')::integer AS reserved_count,
    COUNT(r.id) FILTER (WHERE r.status = 'redeemed')::integer AS redeemed_count,
    COALESCE(SUM(r.discount_amount) FILTER (WHERE r.status = 'redeemed'), 0)::text AS discount_total,
    COALESCE(SUM(b.total_amount) FILTER (WHERE r.status = 'redeemed'), 0)::text AS revenue
    FROM coupons c LEFT JOIN coupon_redemptions r ON r.coupon_id = c.id
    LEFT JOIN bookings b ON b.id = r.booking_id
    GROUP BY c.id ORDER BY c.created_at DESC`, { type: Sequelize.QueryTypes.SELECT });
  const campaigns = new Map();
  for (const row of rows) {
    const current = campaigns.get(row.campaign_name) || { name: row.campaign_name,
      codes: 0, redeemed_count: 0, revenue: 0n, discount_total: 0n };
    current.codes++;
    current.redeemed_count += Number(row.redeemed_count);
    current.revenue += BigInt(row.revenue);
    current.discount_total += BigInt(row.discount_total);
    campaigns.set(row.campaign_name, current);
  }
  return { coupons: rows, campaigns: Array.from(campaigns.values(), (item) =>
    ({ ...item, revenue: item.revenue.toString(), discount_total: item.discount_total.toString() })) };
}

/** Worker gửi thông báo theo lô và khóa trùng, tôn trọng lựa chọn nhận ưu đãi. */
async function notifyEligible(couponId) {
  const coupon = await Coupon.findByPk(couponId);
  if (!coupon?.is_active || new Date(coupon.ends_at) <= new Date()) return;
  let cursor = "00000000-0000-0000-0000-000000000000";
  while (true) {
    const users = await User.findAll({ where: { id: { [Op.gt]: cursor }, status: "active" },
      attributes: ["id", "location"], order: [["id", "ASC"]], limit: 200 });
    if (!users.length) break;
    for (const user of users) {
      if (!await preferences.allows(user.id, "offers")) continue;
      if (coupon.audience === "new_guest" && await hasPaidBefore(user.id)) continue;
      if (coupon.audience === "returning_guest" && !await hasPaidBefore(user.id)) continue;
      if (coupon.listing_id || coupon.host_id || coupon.city) {
        const favorites = await Favorite.findAll({ where: { user_id: user.id }, attributes: ["listing_id"] });
        const ids = favorites.map((item) => item.listing_id);
        const relevantIds = coupon.listing_id ? ids.filter((id) => String(id) === String(coupon.listing_id)) : ids;
        const matchedListings = relevantIds.length ? await Listing.findAll({ where: {
          id: { [Op.in]: relevantIds }, ...(coupon.host_id ? { host_id: coupon.host_id } : {}),
        }, attributes: ["city"] }) : [];
        const match = matchedListings.some((item) => !coupon.city ||
          String(item.city || "").toLocaleLowerCase("vi") === coupon.city.toLocaleLowerCase("vi"));
        const cityMatch = coupon.city && !coupon.listing_id && !coupon.host_id &&
          String(user.location || "").toLocaleLowerCase("vi").includes(coupon.city.toLocaleLowerCase("vi"));
        if (!match && !cityMatch) continue;
      }
      await Notification.findOrCreate({ where: { user_id: user.id,
        dedupe_key: `coupon:${coupon.id}:${user.id}` }, defaults: {
        type: "promotion", title: `Ưu đãi ${coupon.campaign_name}`,
        message: `Dùng mã ${coupon.code} trước khi ưu đãi kết thúc.`,
        resource_type: "promotion", resource_id: coupon.id } });
    }
    cursor = users.at(-1).id;
  }
}

module.exports = { apply, releaseForBooking, confirmForBooking, repriceBooking,
  create, setActive, report, notifyEligible, validate, discountedSnapshot };
