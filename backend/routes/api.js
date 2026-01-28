const express = require("express");
const router = express.Router();

const authController = require("../controllers/api/v1/auth.controller");
const authMiddleware = require("../middlewares/api/auth.middleware");
const csrfMiddleware = require("../middlewares/csrf.middleware");
const { authLoginLimiter, authRegisterLimiter, authRefreshLimiter } = require("../middlewares/rateLimit");

// CSRF bootstrap (double-submit cookie)
router.get("/v1/auth/csrf", authController.csrf);

router.post("/v1/auth/register", authRegisterLimiter, authController.register);
router.post("/v1/auth/login", authLoginLimiter, authController.login);

router.get("/v1/auth/google", authController.googleStart);
router.get("/v1/auth/google/callback", authController.googleCallback);

router.get("/v1/auth/profile", authMiddleware, authController.profile);

// require CSRF token for refresh/logout when using cookies
router.post("/v1/auth/refresh", authRefreshLimiter, csrfMiddleware, authController.refresh);
router.post("/v1/auth/logout", csrfMiddleware, authController.logout);

// Favorites (Sprint 2+)
const favoriteController = require("../controllers/api/v1/favorite.controller");
router.get("/v1/favorites", authMiddleware, favoriteController.list);
router.post("/v1/favorites/:listingId", authMiddleware, csrfMiddleware, favoriteController.toggle);



// Public listings browsing (Sprint 2)
const listingController = require("../controllers/api/v1/listing.controller");
const amenityController = require("../controllers/api/v1/amenity.controller");

router.get("/v1/listings", listingController.list);
router.get("/v1/listings/:id", listingController.detail);
router.get("/v1/amenities", amenityController.list);


// Uploads (Cloudinary) - host/admin only
const uploadController = require("../controllers/api/v1/upload.controller");
const hostListingImageController = require("../controllers/api/v1/host_listing_image.controller");
const requireRole = require("../middlewares/api/role.middleware");
const { upload, uploadErrorHandler } = require("../middlewares/upload.middleware");
const { uploadLimiter } = require("../middlewares/rateLimit");

router.post(
  "/v1/uploads/listing-image",
  uploadLimiter,
  authMiddleware,
  requireRole(["admin", "host"]),
  csrfMiddleware,
  upload.single("image"),
  uploadErrorHandler,
  uploadController.uploadListingImage
);

router.post(
  "/v1/host/listings/:id/images",
  authMiddleware,
  requireRole(["admin", "host"]),
  csrfMiddleware,
  hostListingImageController.attach
);

router.delete(
  "/v1/host/listings/:id/images/:imageId",
  authMiddleware,
  requireRole(["admin", "host"]),
  csrfMiddleware,
  hostListingImageController.remove
);


module.exports = router;

