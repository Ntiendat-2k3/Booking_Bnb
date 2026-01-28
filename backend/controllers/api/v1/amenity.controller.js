const amenityService = require("../../../services/amenity.service");
const { successResponse, errorResponse } = require("../../../utils/response");

module.exports = {
  list: async (req, res) => {
    try {
      const items = await amenityService.list();
      return successResponse(res, items, "Amenities fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },
};
