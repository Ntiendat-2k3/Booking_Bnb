const { successResponse, errorResponse } = require("../../../utils/response");
const hostListingService = require("../../../services/host_listing.service");
const { invalidateListings, invalidateAmenities } = require("../../../core/cache");
const asyncHandler = require("../../../utils/asyncHandler");
const { isUuid } = require("../../../utils/validators");


module.exports = {
  list: asyncHandler(async (req, res) => {
    const user = req.user?.user;
    const status = req.query.status || null;
    const data = await hostListingService.listForUser(user, { status });
    return successResponse(res, data, "Host listings fetched", 200);
  }),

  create: asyncHandler(async (req, res) => {
    const user = req.user?.user;
    const data = await hostListingService.createDraft(user, req.body);
    return successResponse(res, data, "Draft created", 201);
  }),

  detail: asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
    const user = req.user?.user;
    const data = await hostListingService.getByIdForUser(user, req.params.id);
    return successResponse(res, data, "Fetched", 200);
  }),

  update: asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
    const user = req.user?.user;
    const data = await hostListingService.update(user, req.params.id, req.body);
    invalidateListings();
    return successResponse(res, data, "Updated", 200);
  }),

  setAmenities: asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
    const user = req.user?.user;
    const ids = req.body?.amenity_ids || [];
    const data = await hostListingService.setAmenities(user, req.params.id, ids);
    invalidateAmenities();
    return successResponse(res, data, "Amenities updated", 200);
  }),

  submit: asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
    const user = req.user?.user;
    const data = await hostListingService.submitForReview(user, req.params.id);
    invalidateListings();
    return successResponse(res, data, "Submitted for review", 200);
  }),

  pause: asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
    const user = req.user?.user;
    const data = await hostListingService.pause(user, req.params.id);
    invalidateListings();
    return successResponse(res, data, "Paused", 200);
  }),

  resume: asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
    const user = req.user?.user;
    const data = await hostListingService.resume(user, req.params.id);
    invalidateListings();
    return successResponse(res, data, "Resumed", 200);
  }),

  destroy: asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
    const user = req.user?.user;
    const data = await hostListingService.deleteListing(user, req.params.id);
    invalidateListings();
    return successResponse(res, data, "Deleted", 200);
  }),
};
