const { NotificationPreference, sequelize } = require("../models");

const categories = ["messages", "bookings", "calls", "reminders", "offers"];
const defaults = Object.fromEntries(categories.map((category) => [category, true]));

module.exports = {
  async get(userId) {
    const row = await NotificationPreference.findByPk(userId, { attributes: categories });
    return row ? { ...Object.fromEntries(categories.map((category) => [category, row[category]])), configured: true }
      : { ...defaults, configured: false };
  },
  /** Thiếu bản ghi nghĩa là dùng mặc định; cập nhật từng trường không ghi đè lựa chọn khác. */
  async update(userId, changes) {
    return sequelize.transaction(async (transaction) => {
      const [row] = await NotificationPreference.findOrCreate({ where: { user_id: userId },
        defaults: { ...defaults }, transaction });
      await row.update(changes, { transaction });
      return { ...Object.fromEntries(categories.map((category) => [category, row[category]])), configured: true };
    });
  },
  async allows(userId, category, transaction) {
    if (!categories.includes(category)) throw new Error("Unsupported notification category");
    const row = await NotificationPreference.findByPk(userId, { attributes: [category], transaction });
    return row?.[category] !== false;
  },
};
