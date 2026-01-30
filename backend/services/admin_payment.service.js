const { Payment, Booking, Listing, User } = require("../models");

module.exports = {
  async list({ status = null, provider = null, q = null, limit = 200 } = {}) {
    const where = {};
    if (status && status !== "all") where.status = status;
    if (provider && provider !== "all") where.provider = provider;

    const rows = await Payment.findAll({
      where,
      include: [
        {
          model: Booking,
          as: "booking",
          attributes: ["id", "status", "total_amount", "currency", "check_in", "check_out"],
          include: [
            { model: Listing, as: "listing", attributes: ["id", "title"] },
            { model: User, as: "guest", attributes: ["id", "email", "full_name"] },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: Math.min(500, Math.max(1, Number(limit || 200))),
    });

    let items = rows.map((x) => (x.toJSON ? x.toJSON() : x));

    const s = String(q || "").trim().toLowerCase();
    if (s) {
      items = items.filter((p) => {
        return (
          String(p.id || "").toLowerCase().includes(s) ||
          String(p.booking_id || "").toLowerCase().includes(s) ||
          String(p.provider_txn_ref || "").toLowerCase().includes(s) ||
          String(p.provider_transaction_no || "").toLowerCase().includes(s) ||
          String(p.status || "").toLowerCase().includes(s) ||
          String(p.booking?.guest?.email || "").toLowerCase().includes(s) ||
          String(p.booking?.listing?.title || "").toLowerCase().includes(s)
        );
      });
    }

    return { items };
  },

  async detail(id) {
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Booking,
          as: "booking",
          include: [
            { model: Listing, as: "listing" },
            { model: User, as: "guest", attributes: ["id", "email", "full_name"] },
          ],
        },
      ],
    });
    if (!payment) {
      const err = new Error("Payment not found");
      err.status = 404;
      throw err;
    }
    return { payment };
  },
};
