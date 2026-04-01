const { User, Listing, Booking, Payment, Sequelize } = require("../models");
const { Op } = Sequelize;

module.exports = {
  async getGlobalStats() {
    // 1. Core Counts
    const totalUsers = await User.count({ where: { deleted_at: null } });
    const pendingListings = await Listing.count({ 
      where: { status: "pending", deleted_at: null } 
    });
    const activeBookings = await Booking.count({ 
      where: { status: "confirmed" } 
    });

    // 2. Total Revenue
    const revenueData = await Payment.sum("amount", {
      where: { status: "succeeded" },
    });
    const totalRevenue = Number(revenueData || 0);

    // 3. Monthly Revenue Trends (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyPayments = await Payment.findAll({
      where: {
        status: "succeeded",
        created_at: { [Op.gte]: sixMonthsAgo },
      },
      attributes: [
        [Sequelize.fn("date_trunc", "month", Sequelize.col("created_at")), "month"],
        [Sequelize.fn("sum", Sequelize.col("amount")), "total"],
      ],
      group: [Sequelize.fn("date_trunc", "month", Sequelize.col("created_at"))],
      order: [[Sequelize.fn("date_trunc", "month", Sequelize.col("created_at")), "ASC"]],
    });

    // Map to chart format
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = [];
    
    // Fill in last 6 months (including those with 0 revenue)
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = monthNames[d.getMonth()];
      const mKey = d.toISOString().substring(0, 7); // YYYY-MM
      
      const found = monthlyPayments.find(p => {
        const pDate = new Date(p.getDataValue("month"));
        return pDate.toISOString().substring(0, 7) === mKey;
      });
      
      chartData.push({
        name: mLabel,
        value: found ? Number(found.getDataValue("total")) : 0
      });
    }

    return {
      totalUsers,
      pendingListings,
      activeBookings,
      totalRevenue,
      chartData
    };
  }
};
