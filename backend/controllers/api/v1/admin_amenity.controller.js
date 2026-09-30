const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");
const adminAmenityService = require("../../../services/admin_amenity.service");
const { invalidateAmenities } = require("../../../core/cache");
module.exports = {
  list: asyncHandler(async (req, res) => {
    const {
      q = null,
      active = "all"
    } = req.query || {};
    const data = await adminAmenityService.list({
      q,
      active
    });
    return successResponse(res, data, "Amenities fetched", 200);
  }),
  create: asyncHandler(async (req, res) => {
    const data = await adminAmenityService.create(req.body || {});
    await invalidateAmenities();
    return successResponse(res, data, "Amenity created", 201);
  }),
  update: asyncHandler(async (req, res) => {
    const data = await adminAmenityService.update(req.params.id, req.body || {});
    await invalidateAmenities();
    return successResponse(res, data, "Amenity updated", 200);
  }),
  setActive: asyncHandler(async (req, res) => {
    const {
      is_active
    } = req.body || {};
    const data = await adminAmenityService.setActive(req.params.id, is_active === true);
    await invalidateAmenities();
    return successResponse(res, data, "Amenity updated", 200);
  })
};
