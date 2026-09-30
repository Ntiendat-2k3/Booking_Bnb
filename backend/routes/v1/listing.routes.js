const express = require("express");
const router = express.Router();

const listingController = require("../../controllers/api/v1/listing.controller");
const amenityController = require("../../controllers/api/v1/amenity.controller");
const reviewController = require("../../controllers/api/v1/review.controller");
const favoriteController = require("../../controllers/api/v1/favorite.controller");
const { cache } = require("../../core/cache");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const { listingQuerySchema } = require("../../requests/api/v1/listing.schema");
const { pagination, idParams, uuid } = require("../../requests/api/v1/common.schema");
const Joi = require("joi");
const { createReviewSchema, updateReviewSchema, reviewQuerySchema } = require("../../requests/api/v1/review.schema");

router.get("/listings", validate(listingQuerySchema, "query"), cache(Number(process.env.CACHE_TTL_LISTINGS || 60)), listingController.list);
router.get("/listings/:id", validate(idParams, "params"), cache(Number(process.env.CACHE_TTL_LISTING_DETAIL || 300)), listingController.detail);
router.get("/amenities", cache(Number(process.env.CACHE_TTL_AMENITIES || 3600)), amenityController.list);

router.get("/listings/:id/reviews", validate(idParams, "params"), validate(reviewQuerySchema, "query"), cache(Number(process.env.CACHE_TTL_REVIEWS || 120)), reviewController.listByListing);
router.get("/listings/:id/reviews/mine", authMiddleware, validate(idParams, "params"), reviewController.mineForListing);
router.post("/listings/:id/reviews", authMiddleware, csrfMiddleware, validate(idParams, "params"), validate(createReviewSchema), reviewController.createForListing);
router.patch("/reviews/:id", authMiddleware, csrfMiddleware, validate(idParams, "params"), validate(updateReviewSchema), reviewController.update);
router.delete("/reviews/:id", authMiddleware, csrfMiddleware, validate(idParams, "params"), reviewController.remove);

router.get("/favorites", authMiddleware, validate(pagination, "query"), favoriteController.list);
router.post("/favorites/:listingId", authMiddleware, csrfMiddleware, validate(Joi.object({ listingId: uuid.required() }), "params"), favoriteController.toggle);

module.exports = router;
