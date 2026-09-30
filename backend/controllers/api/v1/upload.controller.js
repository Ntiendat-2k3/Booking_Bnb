const imageService = require("../../../services/host_listing_image.service");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");
module.exports = {
  uploadListingImage: asyncHandler(async (req, res) => {
    const data = await imageService.upload(req.user.user, req.file, req.query.listing_id);
    return successResponse(res, data, "Uploaded", 201);
  })
};
