const listingService = require("../../../services/listing.service");
const { successResponse, errorResponse } = require("../../../utils/response");

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function toInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  list: async (req, res) => {
    try {
      const filters = {
        city: req.query.city || null,
        country: req.query.country || null,
        min_price: toInt(req.query.min_price),
        max_price: toInt(req.query.max_price),
        guests: toInt(req.query.guests),
        bedrooms: toInt(req.query.bedrooms),
        room_type: req.query.room_type || null,
        property_type: req.query.property_type || null,
        sort: req.query.sort || null,
        page: toInt(req.query.page) || 1,
        limit: toInt(req.query.limit) || 20,
      };

      const data = await listingService.list(filters);
      return successResponse(res, data, "Listings fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  detail: async (req, res) => {
    try {
      
      if (!isUuid(req.params.id)) {
        return errorResponse(res, "Invalid listing id", 400);
      }
const data = await listingService.detail(req.params.id);
      return successResponse(res, data, "Listing fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },
};
