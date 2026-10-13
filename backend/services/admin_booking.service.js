const Repository = require("../core/repository");
const { Booking, Listing, User, Sequelize } = require("../models");
const { literal } = Sequelize;

module.exports = {
  async list({ status = null, q = null, limit = 200, page = 1 } = {}) {
    const where = Repository.searchWhere(q, ["Booking.id","Booking.guest_id","Booking.listing_id","Booking.status","guest.email","guest.full_name","listing.title"]);
    if (status && status !== "all") where.status = status;

    const include = [
      { model: Listing, as: "listing", attributes: ["id", "title", "city", "country"] },
      { model: User, as: "guest", attributes: ["id", "full_name", "email", "avatar_url"] },
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

    const [rows, statusCounts] = await Promise.all([
      Booking.findAll({
        where, attributes: attrs, include,
        order: [["created_at", "DESC"]],
        limit, offset: (page - 1) * limit,
      }),
      Booking.count({
        where,
        include: include.map(({ model, as }) => ({ model, as, attributes: [] })),
        group: ["Booking.status"],
      }),
    ]);
    const statuses = { completed: 0, pending_payment: 0, confirmed: 0, cancelled: 0 };
    for (const row of statusCounts) if (row.status in statuses) statuses[row.status] = Number(row.count);
    const total = statusCounts.reduce((sum, row) => sum + Number(row.count), 0);
    return { items: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit), statuses } };
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
