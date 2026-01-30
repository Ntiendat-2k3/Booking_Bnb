const { Op } = require("sequelize");
const { Booking, Listing, Payment, Sequelize } = require("../models");

const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES || 15);

function daysBetween(checkIn, checkOut) {
  const a = new Date(checkIn + "T00:00:00Z");
  const b = new Date(checkOut + "T00:00:00Z");
  const diff = (b - a) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

function nowMinusMinutes(min) {
  return new Date(Date.now() - min * 60 * 1000);
}

async function assertAvailability({ listingId, check_in, check_out }) {
  // Block confirmed bookings and "fresh" pending_payment bookings
  const holdCutoff = nowMinusMinutes(HOLD_MINUTES);
  const overlapping = await Booking.findOne({
    where: {
      listing_id: listingId,
      [Op.or]: [
        { status: "confirmed" },
        { status: "pending_payment", created_at: { [Op.gte]: holdCutoff } },
      ],
      // overlap: NOT (existing.check_out <= check_in OR existing.check_in >= check_out)
      [Op.and]: [
        { check_in: { [Op.lt]: check_out } },
        { check_out: { [Op.gt]: check_in } },
      ],
    },
  });

  if (overlapping) {
    const err = new Error("Dates are not available");
    err.status = 409;
    throw err;
  }
}

module.exports = {
  async create({ userId, listingId, check_in, check_out, guests_count }) {
    if (!listingId) {
      const err = new Error("listing_id is required");
      err.status = 400;
      throw err;
    }
    if (!check_in || !check_out) {
      const err = new Error("check_in and check_out are required");
      err.status = 400;
      throw err;
    }

    // Disallow past check-in (yyyy-mm-dd lexical compare works)
    const todayStr = new Date().toISOString().slice(0, 10);
    if (String(check_in) < todayStr) {
      const err = new Error("check_in must be today or later");
      err.status = 400;
      throw err;
    }
    const nights = daysBetween(check_in, check_out);
    if (!Number.isFinite(nights) || nights <= 0) {
      const err = new Error("Invalid date range");
      err.status = 400;
      throw err;
    }

    const listing = await Listing.findOne({
      where: { id: listingId, deleted_at: null, status: "published" },
      attributes: ["id", "price_per_night", "max_guests", "host_id", "title"],
    });

    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }

    const guests = Number(guests_count || 1);
    if (!Number.isInteger(guests) || guests <= 0) {
      const err = new Error("Invalid guests_count");
      err.status = 400;
      throw err;
    }
    if (guests > listing.max_guests) {
      const err = new Error("Guests exceed max_guests");
      err.status = 400;
      throw err;
    }

    // prevent self booking
    if (String(listing.host_id) === String(userId)) {
      const err = new Error("Host cannot book own listing");
      err.status = 400;
      throw err;
    }

    await assertAvailability({ listingId: listing.id, check_in, check_out });

    const pricePerNight = BigInt(listing.price_per_night);
    const total = pricePerNight * BigInt(nights);

    const booking = await Booking.create({
      listing_id: listing.id,
      guest_id: userId,
      check_in,
      check_out,
      guests_count: guests,
      status: "pending_payment",
      price_per_night_snapshot: listing.price_per_night,
      total_amount: total.toString(),
      currency: "VND",
    });

    return { booking, listing };
  },

  async myBookings({ userId }) {
    const { literal } = Sequelize;
    const items = await Booking.findAll({
      where: { guest_id: userId },
      order: [["created_at", "DESC"]],
      include: [
        {
          association: "listing",
          attributes: {
            include: [
              [
                literal(`(
                  SELECT li.url
                  FROM listing_images li
                  WHERE li.listing_id = "listing".id
                  ORDER BY li.is_cover DESC, li.sort_order ASC
                  LIMIT 1
                )`),
                "cover_url",
              ],
            ],
            exclude: ["deleted_at"],
          },
        },
        {
          association: "payments",
          attributes: [
            "id",
            "provider",
            "status",
            "amount",
            "currency",
            "provider_txn_ref",
            "provider_transaction_no",
            "paid_at",
            "created_at",
          ],
          separate: true,
          order: [["created_at", "DESC"]],
        },
        {
          association: "review",
          attributes: ["id", "rating", "comment", "created_at"],
          required: false,
        },
      ],
    });

    // Add computed can_review flag for FE.
    const today = new Date().toISOString().slice(0, 10);
    return items.map((b) => {
      const plain = b.toJSON();
      const canReview =
        !plain.review &&
        (
          plain.status === "completed" ||
          (plain.status === "confirmed" && String(plain.check_out) <= today)
        );
      plain.can_review = !!canReview;
      return plain;
    });
  },

  async checkout({ userId, bookingId }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      const err = new Error("Booking not found");
      err.status = 404;
      throw err;
    }
    if (String(booking.guest_id) !== String(userId)) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    if (booking.status !== "confirmed") {
      const err = new Error("Booking is not confirmed");
      err.status = 400;
      throw err;
    }

    const paid = await Payment.findOne({
      where: { booking_id: booking.id, provider: "vnpay", status: "succeeded" },
      order: [["created_at", "DESC"]],
    });
    if (!paid) {
      const err = new Error("Booking is not paid");
      err.status = 400;
      throw err;
    }

    booking.status = "completed";
    await booking.save();
    return booking;
  },

  async cancel({ userId, bookingId }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      const err = new Error("Booking not found");
      err.status = 404;
      throw err;
    }
    if (String(booking.guest_id) !== String(userId)) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    if (!["pending_payment", "confirmed"].includes(booking.status)) {
      const err = new Error("Booking cannot be cancelled");
      err.status = 400;
      throw err;
    }

    // Basic policy: allow cancel confirmed only before check_in
    if (booking.status === "confirmed") {
      const today = new Date();
      const checkIn = new Date(String(booking.check_in) + "T00:00:00Z");
      if (checkIn <= today) {
        const err = new Error("Too late to cancel");
        err.status = 400;
        throw err;
      }
    }

    booking.status = "cancelled";
    await booking.save();
    return booking;
  },
};
