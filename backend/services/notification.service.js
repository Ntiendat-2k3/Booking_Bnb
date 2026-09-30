const { Notification } = require("../models");
const httpError = require("../utils/httpError");

module.exports = {
  list(userId) {
    return Notification.findAll({ where: { user_id: userId }, order: [["created_at", "DESC"]], limit: 50 });
  },
  async markAsRead(userId, id) {
    const notification = await Notification.findOne({ where: { id, user_id: userId } });
    if (!notification) throw httpError(404, "Notification not found");
    return notification.update({ is_read: true });
  },
  markAllAsRead(userId) {
    return Notification.update({ is_read: true }, { where: { user_id: userId, is_read: false } });
  },
};
