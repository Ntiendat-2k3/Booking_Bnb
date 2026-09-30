const asyncHandler = require("../../../utils/asyncHandler");
const { successResponse } = require("../../../utils/response");
const adminReviewService = require("../../../services/admin_review.service");
const { invalidateReviews, invalidateListings } = require("../../../core/cache");
module.exports = {
  list: asyncHandler(async (req, res) => {
    const {
      visibility = "all",
      q = null,
      limit = 200,
      page = 1
    } = req.query || {};
    const data = await adminReviewService.list({
      visibility,
      q,
      limit,
      page
    });
    return successResponse(res, data, "Reviews fetched", 200);
  }),
  hide: asyncHandler(async (req, res) => {
    const data = await adminReviewService.setHidden(req.params.id, true);
    const listingId = data?.review?.listing_id;
    await invalidateReviews(listingId);
    return successResponse(res, data, "Hidden", 200);
  }),
  unhide: asyncHandler(async (req, res) => {
    const data = await adminReviewService.setHidden(req.params.id, false);
    const listingId = data?.review?.listing_id;
    await invalidateReviews(listingId);
    return successResponse(res, data, "Visible", 200);
  }),
  remove: asyncHandler(async (req, res) => {
    const data = await adminReviewService.remove(req.params.id);
    const listingId = data?.listing_id;
    await invalidateReviews(listingId);
    return successResponse(res, data, "Deleted", 200);
  }),
  bulkHide: asyncHandler(async (req, res) => {
    const ids = req.body?.ids || [];
    const data = await adminReviewService.bulkSetHidden(ids, true);
    await invalidateListings();
    return successResponse(res, data, "Bulk hide processed", 200);
  }),
  bulkUnhide: asyncHandler(async (req, res) => {
    const ids = req.body?.ids || [];
    const data = await adminReviewService.bulkSetHidden(ids, false);
    await invalidateListings();
    return successResponse(res, data, "Bulk unhide processed", 200);
  }),
  bulkRemove: asyncHandler(async (req, res) => {
    const ids = req.body?.ids || [];
    const data = await adminReviewService.bulkRemove(ids);
    await invalidateListings();
    return successResponse(res, data, "Bulk remove processed", 200);
  })
};
