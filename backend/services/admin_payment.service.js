const Repository = require("../core/repository");
const { Payment, Booking, Listing, User } = require("../models");

module.exports = {
  async list({ status = null, provider = null, q = null, limit = 200, page = 1 } = {}) {
    const where = Repository.searchWhere(q, ["Payment.id","Payment.booking_id","Payment.provider_txn_ref","Payment.provider_transaction_no","Payment.status","booking->guest.email","booking->listing.title"]);
    if (status && status !== "all") where.status = status;
    if (provider && provider !== "all") where.provider = provider;

    const { rows, count } = await Payment.findAndCountAll({
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
      limit, offset: (page - 1) * limit, distinct: true,
    });

    return { items: rows, meta: { page, limit, total: count, total_pages: Math.ceil(count / limit) } };
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
