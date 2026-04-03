const express = require("express");
const router = express.Router();

const listingController = require("../../controllers/api/v1/listing.controller");
const amenityController = require("../../controllers/api/v1/amenity.controller");
const reviewController = require("../../controllers/api/v1/review.controller");
const favoriteController = require("../../controllers/api/v1/favorite.controller");
const { cache } = require("../../core/cache");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");

// Public browsing (cached)
router.get("/listings", cache(Number(process.env.CACHE_TTL_LISTINGS || 60)), listingController.list);
router.get("/listings/:id", cache(Number(process.env.CACHE_TTL_LISTING_DETAIL || 300)), listingController.detail);
router.get("/amenities", cache(Number(process.env.CACHE_TTL_AMENITIES || 3600)), amenityController.list);

// Reviews
router.get("/listings/:id/reviews", cache(Number(process.env.CACHE_TTL_REVIEWS || 120)), reviewController.listByListing);
router.get("/listings/:id/reviews/mine", authMiddleware, reviewController.mineForListing);
router.post("/listings/:id/reviews", authMiddleware, csrfMiddleware, reviewController.createForListing);
router.patch("/reviews/:id", authMiddleware, csrfMiddleware, reviewController.update);
router.delete("/reviews/:id", authMiddleware, csrfMiddleware, reviewController.remove);

// Favorites
router.get("/favorites", authMiddleware, favoriteController.list);
router.post("/favorites/:listingId", authMiddleware, csrfMiddleware, favoriteController.toggle);

module.exports = router;
