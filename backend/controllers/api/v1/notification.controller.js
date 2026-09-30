const notifications = require("../../../services/notification.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");
module.exports = {
  getMyNotifications: asyncHandler(async (req, res) => successResponse(res, await notifications.list(req.user.user.id))),
  markAsRead: asyncHandler(async (req, res) => successResponse(res, await notifications.markAsRead(req.user.user.id, req.params.id))),
  markAllAsRead: asyncHandler(async (req, res) => {
    await notifications.markAllAsRead(req.user.user.id);
    return successResponse(res, null, "All notifications marked as read");
  })
};
