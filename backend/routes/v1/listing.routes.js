const express = require("express");
const router = express.Router();

const listingController = require("../../controllers/api/v1/listing.controller");
const amenityController = require("../../controllers/api/v1/amenity.controller");
const reviewController = require("../../controllers/api/v1/review.controller");
const favoriteController = require("../../controllers/api/v1/favorite.controller");
const calendarController = require("../../controllers/api/v1/calendar.controller");
const pricingController = require("../../controllers/api/v1/pricing.controller");
const { cache } = require("../../core/cache");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const { listingQuerySchema } = require("../../requests/api/v1/listing.schema");
const { publicCalendarQuery, pricingQuote } = require("../../requests/api/v1/calendar.schema");
const { listingView } = require("../../requests/api/v1/analytics.schema");
const { listingViewLimiter } = require("../../middlewares/rateLimit");
const { pagination, idParams, uuid } = require("../../requests/api/v1/common.schema");
const Joi = require("joi");
const { createReviewSchema, updateReviewSchema, reviewQuerySchema } = require("../../requests/api/v1/review.schema");

const listingCache = cache(Number(process.env.CACHE_TTL_LISTINGS || 60));
router.get("/listings", validate(listingQuerySchema, "query"),
  (req, res, next) => req.query.check_in ? next() : listingCache(req, res, next), listingController.list);
router.get("/listings/:id", validate(idParams, "params"), cache(Number(process.env.CACHE_TTL_LISTING_DETAIL || 300)), listingController.detail);
router.post("/listings/:id/view", listingViewLimiter, validate(idParams, "params"),
  validate(listingView), listingController.recordView);
router.get("/listings/:id/availability", validate(idParams, "params"), validate(publicCalendarQuery, "query"), calendarController.publicAvailability);
router.get("/listings/:id/quote", validate(idParams, "params"), validate(pricingQuote, "query"), pricingController.quote);
router.get("/amenities", cache(Number(process.env.CACHE_TTL_AMENITIES || 3600)), amenityController.list);

router.get("/listings/:id/reviews", validate(idParams, "params"), validate(reviewQuerySchema, "query"), cache(Number(process.env.CACHE_TTL_REVIEWS || 120)), reviewController.listByListing);
router.get("/listings/:id/reviews/mine", authMiddleware, validate(idParams, "params"), reviewController.mineForListing);
router.post("/listings/:id/reviews", authMiddleware, csrfMiddleware, validate(idParams, "params"), validate(createReviewSchema), reviewController.createForListing);
router.patch("/reviews/:id", authMiddleware, csrfMiddleware, validate(idParams, "params"), validate(updateReviewSchema), reviewController.update);
router.delete("/reviews/:id", authMiddleware, csrfMiddleware, validate(idParams, "params"), reviewController.remove);

router.get("/favorites", authMiddleware, validate(pagination, "query"), favoriteController.list);
router.post("/favorites/:listingId", authMiddleware, csrfMiddleware, validate(Joi.object({ listingId: uuid.required() }), "params"), favoriteController.toggle);

module.exports = router;
