const asyncHandler = require("../../../utils/asyncHandler");
const favoriteService = require("../../../services/favorite.service");
const { successResponse } = require("../../../utils/response");
module.exports = {
  list: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const {
      items,
      meta
    } = await favoriteService.list(userId, req.query);
    return successResponse(res, items, "Favorites fetched", 200, meta);
  }),
  toggle: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const listingId = req.params.listingId;
    const result = await favoriteService.toggle(userId, listingId);
    return successResponse(res, result, "Favorite updated", 200);
  })
};
