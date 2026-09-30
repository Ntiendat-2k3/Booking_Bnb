const asyncHandler = require("../../../utils/asyncHandler");
const amenityService = require("../../../services/amenity.service");
const { successResponse } = require("../../../utils/response");
module.exports = {
  list: asyncHandler(async (req, res) => {
    const items = await amenityService.list();
    return successResponse(res, items, "Amenities fetched", 200);
  })
};
