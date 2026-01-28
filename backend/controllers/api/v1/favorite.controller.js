const favoriteService = require("../../../services/favorite.service");
const { successResponse, errorResponse } = require("../../../utils/response");

module.exports = {
  list: async (req, res) => {
    try {
      const userId = req.user.user.id;
      const items = await favoriteService.list(userId);
      return successResponse(res, items, "Favorites fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  toggle: async (req, res) => {
    try {
      const userId = req.user.user.id;
      const listingId = req.params.listingId;
      const result = await favoriteService.toggle(userId, listingId);
      return successResponse(res, result, "Favorite updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },
};
