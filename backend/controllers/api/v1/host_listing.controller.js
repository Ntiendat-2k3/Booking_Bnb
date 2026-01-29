const { successResponse, errorResponse } = require("../../../utils/response");
const hostListingService = require("../../../services/host_listing.service");

function isUuid(v) {
  return hostListingService.isUuid(v);
}

module.exports = {
  // GET /api/v1/host/listings?status=
  list: async (req, res) => {
    try {
      const user = req.user?.user;
      const status = req.query.status || null;
      const data = await hostListingService.listForUser(user, { status });
      return successResponse(res, data, "Host listings fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  // POST /api/v1/host/listings
  create: async (req, res) => {
    try {
      const user = req.user?.user;
      const data = await hostListingService.createDraft(user, req.body);
      return successResponse(res, data, "Draft created", 201);
    } catch (e) {
      return errorResponse(res, e.message || "Create failed", e.status || 500);
    }
  },

  // GET /api/v1/host/listings/:id
  detail: async (req, res) => {
    try {
      if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
      const user = req.user?.user;
      const data = await hostListingService.getByIdForUser(user, req.params.id);
      return successResponse(res, data, "Fetched", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Fetch failed", e.status || 500);
    }
  },

  // PATCH /api/v1/host/listings/:id
  update: async (req, res) => {
    try {
      if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
      const user = req.user?.user;
      const data = await hostListingService.update(user, req.params.id, req.body);
      return successResponse(res, data, "Updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },

  // PUT /api/v1/host/listings/:id/amenities
  setAmenities: async (req, res) => {
    try {
      if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
      const user = req.user?.user;
      const ids = req.body?.amenity_ids || [];
      const data = await hostListingService.setAmenities(user, req.params.id, ids);
      return successResponse(res, data, "Amenities updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },

  // POST /api/v1/host/listings/:id/submit
  submit: async (req, res) => {
    try {
      if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
      const user = req.user?.user;
      const data = await hostListingService.submitForReview(user, req.params.id);
      return successResponse(res, data, "Submitted for review", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Submit failed", e.status || 500);
    }
  },

  // POST /api/v1/host/listings/:id/pause
  pause: async (req, res) => {
    try {
      if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
      const user = req.user?.user;
      const data = await hostListingService.pause(user, req.params.id);
      return successResponse(res, data, "Paused", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Pause failed", e.status || 500);
    }
  },

  // POST /api/v1/host/listings/:id/resume
  resume: async (req, res) => {
    try {
      if (!isUuid(req.params.id)) return errorResponse(res, "Invalid listing id", 400);
      const user = req.user?.user;
      const data = await hostListingService.resume(user, req.params.id);
      return successResponse(res, data, "Resumed", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Resume failed", e.status || 500);
    }
  },
};
