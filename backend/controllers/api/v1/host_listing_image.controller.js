const imageService = require("../../../services/host_listing_image.service");
const { successResponse } = require("../../../utils/response");
const { invalidateListings } = require("../../../core/cache");
const asyncHandler = require("../../../utils/asyncHandler");
module.exports = {
  attach: asyncHandler(async (req, res) => {
    const data = await imageService.attach(req.user.user, req.params.id, req.body);
    await invalidateListings(req.params.id);
    return successResponse(res, data, "Attached", 201);
  }),
  setCover: asyncHandler(async (req, res) => {
    const data = await imageService.setCover(req.user.user, req.params.id, req.params.imageId);
    await invalidateListings(req.params.id);
    return successResponse(res, data, "Cover updated");
  }),
  remove: asyncHandler(async (req, res) => {
    const data = await imageService.remove(req.user.user, req.params.id, req.params.imageId);
    await invalidateListings(req.params.id);
    return successResponse(res, data, "Deleted");
  })
};
