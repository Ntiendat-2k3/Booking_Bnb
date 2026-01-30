const { Booking, Listing, User, Sequelize } = require("../models");
const { literal } = Sequelize;

module.exports = {
  async list({ status = null, q = null, limit = 200 } = {}) {
    const where = {};
    if (status && status !== "all") where.status = status;

    // NOTE: We keep search simple and safe: search by booking id (uuid) or guest email/name or listing title.
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

    const rows = await Booking.findAll({
      where,
      attributes: attrs,
      include,
      order: [["created_at", "DESC"]],
      limit: Math.min(500, Math.max(1, Number(limit || 200))),
    });

    let items = rows.map((x) => (x.toJSON ? x.toJSON() : x));

    const s = String(q || "").trim().toLowerCase();
    if (s) {
      items = items.filter((b) => {
        return (
          String(b.id || "").toLowerCase().includes(s) ||
          String(b.status || "").toLowerCase().includes(s) ||
          String(b.guest?.email || "").toLowerCase().includes(s) ||
          String(b.guest?.full_name || "").toLowerCase().includes(s) ||
          String(b.listing?.title || "").toLowerCase().includes(s)
        );
      });
    }

    return { items };
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
