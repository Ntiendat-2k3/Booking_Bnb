const Repository = require("../core/repository");
const { Payment, Booking, Listing, User, Sequelize } = require("../models");
const { bookingReferenceFromCode, transformAdminBooking } = require("../transformers/booking.transformer");
const { paymentReferenceFromCode } = require("../transformers/payment.transformer");

/** Bổ sung mã booking cho giao dịch mà vẫn giữ UUID để tra cứu nội bộ. */
function transformAdminPayment(payment) {
  const plain = typeof payment.toJSON === "function" ? payment.toJSON() : { ...payment };
  return { ...plain, ...(plain.booking ? { booking: transformAdminBooking(plain.booking) } : {}) };
}

module.exports = {
  async list({ status = null, provider = null, q = null, limit = 200, page = 1 } = {}) {
    const paymentReference = paymentReferenceFromCode(q);
    const bookingReference = bookingReferenceFromCode(q);
    const where = paymentReference ? { reference_number: paymentReference }
      : bookingReference ? { "$booking.reference_number$": bookingReference }
      : Repository.searchWhere(q, ["Payment.id","Payment.booking_id","Payment.provider_txn_ref","Payment.provider_transaction_no","Payment.status","booking->guest.email","booking->listing.title"]);
    if (status && status !== "all") where.status = status;
    if (provider && provider !== "all") where.provider = provider;

    const include = [
        {
          model: Booking,
          as: "booking",
          attributes: ["id", "reference_number", "status", "total_amount", "currency", "check_in", "check_out"],
          include: [
            { model: Listing, as: "listing", attributes: ["id", "reference_number", "title"] },
            { model: User, as: "guest", attributes: ["id", "email", "full_name", "avatar_url"] },
          ],
        },
    ];
    const [rows, summary] = await Promise.all([
      Payment.findAll({
        where, include, order: [["created_at", "DESC"]],
        limit, offset: (page - 1) * limit,
      }),
      Payment.findOne({
        where,
        include: [{
          model: Booking, as: "booking", attributes: [],
          include: [
            { model: Listing, as: "listing", attributes: [] },
            { model: User, as: "guest", attributes: [] },
          ],
        }],
        attributes: [
          [Sequelize.literal(`COUNT(*)`), "total"],
          [Sequelize.literal(`COUNT(*) FILTER (WHERE "Payment".status = 'succeeded')`), "succeeded"],
          [Sequelize.literal(`COUNT(*) FILTER (WHERE "Payment".status = 'pending')`), "pending"],
          [Sequelize.literal(`COALESCE(SUM("Payment".amount) FILTER (WHERE "Payment".status = 'succeeded' AND "Payment".currency = 'VND'), 0)`), "revenue"],
        ],
        raw: true,
      }),
    ]);

    return {
      items: rows.map(transformAdminPayment),
      meta: {
        page, limit, total: Number(summary?.total || 0), total_pages: Math.ceil(Number(summary?.total || 0) / limit),
        summary: { succeeded: Number(summary?.succeeded || 0), pending: Number(summary?.pending || 0), revenue: Number(summary?.revenue || 0) },
      },
    };
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
    return { payment: transformAdminPayment(payment) };
  },
};
