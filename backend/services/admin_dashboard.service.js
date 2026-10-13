const { User, Listing, Booking, Payment, Sequelize } = require("../models");

module.exports = {
  /** Tổng doanh thu và từng tháng cùng lấy từ các khoản VND đã thanh toán. */
  async getGlobalStats() {
    const totalUsers = await User.count({ where: { deleted_at: null, role: { [Sequelize.Op.ne]: "super_admin" } } });
    const pendingListings = await Listing.count({ where: { status: "pending", deleted_at: null } });
    const activeBookings = await Booking.count({ where: { status: "confirmed" } });

    // Ngày thanh toán là mốc ghi nhận doanh thu; dữ liệu cũ thiếu paid_at dùng ngày tạo.
    const monthExpression = `to_char(COALESCE("Payment"."paid_at", "Payment"."created_at") AT TIME ZONE 'UTC', 'YYYY-MM')`;
    const monthlyPayments = await Payment.findAll({
      where: { status: "succeeded", currency: "VND" },
      attributes: [
        [Sequelize.literal(monthExpression), "month"],
        [Sequelize.fn("SUM", Sequelize.col("amount")), "total"],
      ],
      group: [Sequelize.literal(monthExpression)],
      raw: true,
    });

    const totals = new Map(monthlyPayments.map((row) => [row.month, Number(row.total || 0)]));
    const totalRevenue = [...totals.values()].reduce((sum, value) => sum + value, 0);
    const chartData = [];
    if (totals.size) {
      const months = [...totals.keys()].sort();
      const firstMonth = months[0];
      const currentMonth = new Date().toISOString().slice(0, 7);
      const endMonth = months.at(-1) > currentMonth ? months.at(-1) : currentMonth;
      const [year, month] = firstMonth.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, 1));

      for (let key = date.toISOString().slice(0, 7); key <= endMonth; key = date.toISOString().slice(0, 7)) {
        chartData.push({ month: key, value: totals.get(key) || 0 });
        date.setUTCMonth(date.getUTCMonth() + 1);
      }
    }

    return { totalUsers, pendingListings, activeBookings, totalRevenue, chartData };
  },
};
