const { User, Listing, Booking, Sequelize } = require("../models");
const { sanitizeUser } = require("./auth.service");
const { enqueue } = require("./background_job.service");
const { message } = require("../templates/emails");
const httpError = require("../utils/httpError");
const { Op } = Sequelize;

module.exports = {
  async apply(user) {
    if (!["guest", "host", "admin"].includes(user.role)) throw httpError(400, "Vai trò không hợp lệ");
    if (user.role === "guest") await User.update({ role: "host" }, { where: { id: user.id, role: "guest" } });
    return sanitizeUser(await User.findByPk(user.id));
  },

  async getDashboardStats(hostId) {
    const now = new Date();
    const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const include = [{ model: Listing, as: "listing", attributes: [], required: true, where: { host_id: hostId } }];
    const stats = await Booking.findOne({
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("Booking.id")), "totalBookings"],
        [Sequelize.literal("COALESCE(SUM(CASE WHEN \"Booking\".status IN ('confirmed','completed') THEN \"Booking\".total_amount ELSE 0 END), 0)"), "totalRevenue"],
        [Sequelize.literal("COUNT(CASE WHEN \"Booking\".status = 'pending_payment' THEN 1 END)"), "pendingBookings"],
      ], include, raw: true,
    });
    const monthly = await Booking.findAll({
      where: { status: ["confirmed", "completed"], created_at: { [Op.gte]: firstMonth } },
      attributes: [[Sequelize.literal("to_char(\"Booking\".created_at AT TIME ZONE 'UTC', 'YYYY-MM')"), "month"], [Sequelize.fn("SUM", Sequelize.col("Booking.total_amount")), "total"]],
      include, group: [Sequelize.literal("to_char(\"Booking\".created_at AT TIME ZONE 'UTC', 'YYYY-MM')")], raw: true,
    });
    const recentBookings = await Booking.findAll({
      include: [
        { model: User, as: "guest", attributes: ["id", "full_name", "avatar_url"] },
        { model: Listing, as: "listing", attributes: ["id", "title"], required: true, where: { host_id: hostId } },
      ], order: [["created_at", "DESC"]], limit: 5,
    });
    const months = Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1)));
    return {
      totalRevenue: Number(stats?.totalRevenue || 0), totalBookings: Number(stats?.totalBookings || 0), pendingBookings: Number(stats?.pendingBookings || 0),
      chartLabels: months.map((month) => `Th${String(month.getUTCMonth() + 1).padStart(2, "0")} ${month.getUTCFullYear()}`),
      chartValues: months.map((month) => Number(monthly.find((row) => row.month === month.toISOString().slice(0, 7))?.total || 0)), recentBookings,
    };
  },

  async contactHost(hostId, { email, phone, content }) {
    const host = await User.findOne({ where: { id: hostId, role: ["host", "admin"], status: "active" }, attributes: ["email", "full_name"] });
    if (!host) throw httpError(404, "Không tìm thấy chủ nhà");
    await enqueue("send_email", { to: host.email, subject: "Yêu cầu liên hệ mới từ khách hàng", html: message(`Chào ${host.full_name}`, [`Email người gửi: ${email}`, `Số điện thoại: ${phone || "Không cung cấp"}`, content]) });
  },
};
