const notifications = require("../../../services/notification.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");
const preferences = require("../../../services/notification-preference.service");
module.exports = {
  getMyNotifications: asyncHandler(async (req, res) => successResponse(res, await notifications.list(req.user.user.id))),
  getFeed: asyncHandler(async (req, res) => successResponse(res, await notifications.feed(req.user.user.id, req.query))),
  getPreferences: asyncHandler(async (req, res) => successResponse(res, await preferences.get(req.user.user.id))),
  updatePreferences: asyncHandler(async (req, res) => successResponse(res,
    await preferences.update(req.user.user.id, req.body))),
  markAsRead: asyncHandler(async (req, res) => successResponse(res, await notifications.markAsRead(req.user.user.id, req.params.id))),
  markAllAsRead: asyncHandler(async (req, res) => {
    await notifications.markAllAsRead(req.user.user.id);
    return successResponse(res, null, "All notifications marked as read");
  })
};
