const asyncHandler = require("../../../utils/asyncHandler");
const reviewService = require("../../../services/review.service");
const { successResponse } = require("../../../utils/response");
const { invalidateReviews } = require("../../../core/cache");
const { toInt } = require("../../../utils/validators");
module.exports = {
  listByListing: asyncHandler(async (req, res) => {
    const listingId = req.params.id;
    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 10);
    const data = await reviewService.listPublicByListing({
      listingId,
      page,
      limit
    });
    return successResponse(res, data, "OK", 200);
  }),
  mineForListing: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const listingId = req.params.id;
    const data = await reviewService.mineForListing({
      userId,
      listingId
    });
    return successResponse(res, data, "OK", 200);
  }),
  createForListing: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const listingId = req.params.id;
    const review = await reviewService.createForListing({
      userId,
      listingId,
      rating: req.body?.rating,
      comment: req.body?.comment
    });

    // Review mới làm thay đổi danh sách review và thứ tự listing theo rating.
    await invalidateReviews(listingId);
    return successResponse(res, review, "Created", 201);
  }),
  update: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const reviewId = req.params.id;
    const review = await reviewService.update({
      userId,
      reviewId,
      rating: req.body?.rating,
      comment: req.body?.comment
    });
    const listingId = review?.listing_id;
    await invalidateReviews(listingId);
    return successResponse(res, review, "Updated", 200);
  }),
  remove: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const reviewId = req.params.id;
    const result = await reviewService.remove({
      userId,
      reviewId
    });
    const listingId = result?.listing_id;
    await invalidateReviews(listingId);
    return successResponse(res, {
      ok: true
    }, "Deleted", 200);
  })
};
