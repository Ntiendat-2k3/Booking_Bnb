const Repository = require("../core/repository");
const { Booking, Listing, User, Sequelize } = require("../models");
const { literal } = Sequelize;

module.exports = {
  async list({ status = null, q = null, limit = 200, page = 1 } = {}) {
    const where = Repository.searchWhere(q, ["Booking.id","Booking.status","guest.email","guest.full_name","listing.title"]);
    if (status && status !== "all") where.status = status;

    const include = [
      { model: Listing, as: "listing", attributes: ["id", "title", "city", "country"] },
      { model: User, as: "guest", attributes: ["id", "full_name", "email"] },
    ];

    const attrs = {
      include: [
        [
          literal(`(
            SELECT p.status
            FROM payments p
            WHERE p.booking_id = "Booking".id
            ORDER BY p.created_at DESC
            LIMIT 1
          )`),
          "last_payment_status",
        ],
        [
          literal(`(
            SELECT p.provider
            FROM payments p
            WHERE p.booking_id = "Booking".id
            ORDER BY p.created_at DESC
            LIMIT 1
          )`),
          "last_payment_provider",
        ],
        [
          literal(`(
            SELECT p.paid_at
            FROM payments p
            WHERE p.booking_id = "Booking".id AND p.paid_at IS NOT NULL
            ORDER BY p.paid_at DESC
            LIMIT 1
          )`),
          "paid_at",
        ],
      ],
    };

    const { rows, count } = await Booking.findAndCountAll({
      where,
      attributes: attrs,
      include,
      order: [["created_at", "DESC"]],
      limit, offset: (page - 1) * limit, distinct: true,
    });

    return { items: rows, meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) } };
  },

  async detail(id) {
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Listing, as: "listing", attributes: ["id", "title", "city", "country"] },
        { model: User, as: "guest", attributes: ["id", "full_name", "email"] },
        { association: "payments", required: false },
        { association: "review", required: false },
      ],
    });
    if (!booking) {
      const err = new Error("Booking not found");
      err.status = 404;
      throw err;
    }
    return { booking };
  },
};
