const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");
const adminListingService = require("../../../services/admin_listing.service");
const { invalidateListings } = require("../../../core/cache");
module.exports = {
  list: asyncHandler(async (req, res) => {
    const status = req.query.status || null;
    const data = await adminListingService.list({
      status
    });
    return successResponse(res, data, "Admin listings fetched", 200);
  }),
  approve: asyncHandler(async (req, res) => {
    const data = await adminListingService.approve(req.params.id);
    await invalidateListings(req.params.id);
    return successResponse(res, data, "Approved", 200);
  }),
  reject: asyncHandler(async (req, res) => {
    const reason = req.body?.reason || null;
    const data = await adminListingService.reject(req.params.id, reason);
    await invalidateListings(req.params.id);
    return successResponse(res, data, "Rejected", 200);
  }),
  bulkApprove: asyncHandler(async (req, res) => {
    const ids = req.body?.ids || [];
    const data = await adminListingService.bulkApprove(ids);
    await invalidateListings();
    return successResponse(res, data, "Bulk approve processed", 200);
  }),
  bulkReject: asyncHandler(async (req, res) => {
    const ids = req.body?.ids || [];
    const reason = req.body?.reason || null;
    const data = await adminListingService.bulkReject(ids, reason);
    await invalidateListings();
    return successResponse(res, data, "Bulk reject processed", 200);
  })
};
