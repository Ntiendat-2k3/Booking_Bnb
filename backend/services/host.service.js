const { User, Listing, Booking, Payment, Sequelize } = require("../models");
const { sanitizeUser } = require("./auth.service");
const { enqueue } = require("./background_job.service");
const { message } = require("../templates/emails");
const httpError = require("../utils/httpError");

module.exports = {
  async apply(user) {
    if (!["guest", "host", "admin", "super_admin"].includes(user.role)) throw httpError(400, "Vai trò không hợp lệ");
    if (user.role === "guest") await User.update({ role: "host" }, { where: { id: user.id, role: "guest" } });
    return sanitizeUser(await User.findByPk(user.id));
  },

  /** Thống kê tiền đã thu theo payment của host; tổng tiền là toàn thời kỳ, biểu đồ chỉ gồm sáu tháng UTC gần nhất. */
  async getDashboardStats(hostId) {
    const now = new Date();
    const bookingInclude = [{ model: Listing, as: "listing", attributes: [], required: true, where: { host_id: hostId } }];
    const paymentInclude = [{
      model: Booking,
      as: "booking",
      attributes: [],
      required: true,
      include: bookingInclude,
    }];
    const paidPayments = { status: "succeeded", currency: "VND" };
    // Ghi nhận tiền theo ngày thanh toán; dữ liệu cũ thiếu paid_at dùng ngày tạo payment.
    const paidAtExpression = 'COALESCE("Payment"."paid_at", "Payment"."created_at")';
    const monthExpression = `to_char(${paidAtExpression} AT TIME ZONE 'UTC', 'YYYY-MM')`;
    const stats = await Booking.findOne({
      attributes: [
        [Sequelize.literal("COUNT(CASE WHEN \"Booking\".status IN ('confirmed','completed') THEN 1 END)"), "totalBookings"],
        [Sequelize.literal("COUNT(CASE WHEN \"Booking\".status = 'pending_payment' THEN 1 END)"), "pendingBookings"],
      ], include: bookingInclude, raw: true,
    });
    const monthly = await Payment.findAll({
      where: paidPayments,
      attributes: [[Sequelize.literal(monthExpression), "month"], [Sequelize.fn("SUM", Sequelize.col("Payment.amount")), "total"]],
      include: paymentInclude,
      group: [Sequelize.literal(monthExpression)],
      raw: true,
    });
    const recentPayments = await Payment.findAll({
      where: paidPayments,
      attributes: ["id", "amount", "paid_at", "created_at"],
      include: [{
        model: Booking,
        as: "booking",
        attributes: ["id", "status"],
        required: true,
        include: [
          { model: User, as: "guest", attributes: ["id", "full_name", "avatar_url"] },
          { model: Listing, as: "listing", attributes: ["id", "title"], required: true, where: { host_id: hostId } },
        ],
      }],
      order: [[Sequelize.literal(paidAtExpression), "DESC"], ["id", "DESC"]],
      limit: 5,
      subQuery: false,
    });
    const months = Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1)));
    const totals = new Map(monthly.map((row) => [row.month, Number(row.total || 0)]));
    return {
      totalRevenue: [...totals.values()].reduce((sum, value) => sum + value, 0),
      totalBookings: Number(stats?.totalBookings || 0),
      pendingBookings: Number(stats?.pendingBookings || 0),
      chartMonths: months.map((month) => month.toISOString().slice(0, 7)),
      chartValues: months.map((month) => totals.get(month.toISOString().slice(0, 7)) || 0),
      recentPayments,
    };
  },

  async contactHost(hostId, { email, phone, content }) {
    const host = await User.findOne({ where: { id: hostId, role: ["host", "admin", "super_admin"], status: "active" }, attributes: ["email", "full_name"] });
    if (!host) throw httpError(404, "Không tìm thấy chủ nhà");
    await enqueue("send_email", { to: host.email, subject: "Yêu cầu liên hệ mới từ khách hàng", html: message(`Chào ${host.full_name}`, [`Email người gửi: ${email}`, `Số điện thoại: ${phone || "Không cung cấp"}`, content]) });
  },
};
