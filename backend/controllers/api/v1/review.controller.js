const reviewService = require("../../../services/review.service");
const { successResponse, errorResponse } = require("../../../utils/response");
const { invalidate } = require("../../../core/cache");

function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  async listByListing(req, res) {
    try {
      const listingId = req.params.id;
      const page = toInt(req.query.page, 1);
      const limit = toInt(req.query.limit, 10);

      const data = await reviewService.listPublicByListing({ listingId, page, limit });
      return successResponse(res, data, "OK", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Fetch reviews failed", e.status || 500);
    }
  },

  async mineForListing(req, res) {
    try {
      const userId = req.user.user.id;
      const listingId = req.params.id;
      const data = await reviewService.mineForListing({ userId, listingId });
      return successResponse(res, data, "OK", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Fetch my review failed", e.status || 500);
    }
  },

  async createForListing(req, res) {
    try {
      const userId = req.user.user.id;
      const listingId = req.params.id;
      const review = await reviewService.createForListing({
        userId,
        listingId,
        rating: req.body?.rating,
        comment: req.body?.comment,
      });

      // A new review can affect listing detail, review list, and rating-based sorts
      invalidate(["GET:/api/v1/listings*", `GET:/api/v1/listings/${listingId}*`]).catch(() => {});
      return successResponse(res, review, "Created", 201);
    } catch (e) {
      return errorResponse(res, e.message || "Create review failed", e.status || 500);
    }
  },

  async update(req, res) {
    try {
      const userId = req.user.user.id;
      const reviewId = req.params.id;
      const review = await reviewService.update({
        userId,
        reviewId,
        rating: req.body?.rating,
        comment: req.body?.comment,
      });

      const listingId = review?.listing_id;
      invalidate(["GET:/api/v1/listings*", listingId ? `GET:/api/v1/listings/${listingId}*` : null].filter(Boolean)).catch(() => {});
      return successResponse(res, review, "Updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update review failed", e.status || 500);
    }
  },

  async remove(req, res) {
    try {
      const userId = req.user.user.id;
      const reviewId = req.params.id;
      const result = await reviewService.remove({ userId, reviewId });

      const listingId = result?.listing_id;
      invalidate(["GET:/api/v1/listings*", listingId ? `GET:/api/v1/listings/${listingId}*` : null].filter(Boolean)).catch(() => {});
      return successResponse(res, { ok: true }, "Deleted", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Delete review failed", e.status || 500);
    }
  },
};
