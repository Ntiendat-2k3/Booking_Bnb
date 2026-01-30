const express = require("express");
const router = express.Router();

const authController = require("../controllers/api/v1/auth.controller");
const authMiddleware = require("../middlewares/api/auth.middleware");
const csrfMiddleware = require("../middlewares/csrf.middleware");
const { upload, uploadErrorHandler } = require("../middlewares/upload.middleware");
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

// Account settings (Sprint 5)
const accountController = require("../controllers/api/v1/account.controller");
router.get("/v1/users/me", authMiddleware, accountController.me);
router.patch("/v1/users/me", authMiddleware, csrfMiddleware, accountController.updateProfile);
router.post("/v1/users/me/change-password", authMiddleware, csrfMiddleware, accountController.changePassword);
router.post(
  "/v1/users/me/avatar",
  authMiddleware,
  csrfMiddleware,
  upload.single("image"),
  uploadErrorHandler,
  accountController.uploadAvatar,
);
router.get("/v1/users/me/settings", authMiddleware, accountController.getSettings);
router.patch("/v1/users/me/settings", authMiddleware, csrfMiddleware, accountController.updateSettings);
router.get("/v1/users/me/payment-methods", authMiddleware, accountController.listPaymentMethods);
router.post("/v1/users/me/payment-methods", authMiddleware, csrfMiddleware, accountController.createPaymentMethod);
router.post(
  "/v1/users/me/payment-methods/:id/default",
  authMiddleware,
  csrfMiddleware,
  accountController.setDefaultPaymentMethod,
);
router.delete(
  "/v1/users/me/payment-methods/:id",
  authMiddleware,
  csrfMiddleware,
  accountController.deletePaymentMethod,
);

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


// Reviews (Sprint 5)
const reviewController = require("../controllers/api/v1/review.controller");
router.get("/v1/listings/:id/reviews", reviewController.listByListing);
router.get("/v1/listings/:id/reviews/mine", authMiddleware, reviewController.mineForListing);
router.post("/v1/listings/:id/reviews", authMiddleware, csrfMiddleware, reviewController.createForListing);
router.patch("/v1/reviews/:id", authMiddleware, csrfMiddleware, reviewController.update);
router.delete("/v1/reviews/:id", authMiddleware, csrfMiddleware, reviewController.remove);


// Uploads (Cloudinary) - host/admin only
const uploadController = require("../controllers/api/v1/upload.controller");
const hostListingImageController = require("../controllers/api/v1/host_listing_image.controller");
const requireRole = require("../middlewares/api/role.middleware");
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
router.patch(
  "/v1/host/listings/:id/images/:imageId/cover",
  authMiddleware,
  requireRole(["admin", "host"]),
  csrfMiddleware,
  hostListingImageController.setCover
);



// Host onboarding (guest -> host)
const hostController = require("../controllers/api/v1/host.controller");
router.post("/v1/host/apply", authMiddleware, csrfMiddleware, hostController.apply);

// Host listings CRUD (Sprint 3)
const hostListingController = require("../controllers/api/v1/host_listing.controller");
router.get("/v1/host/listings", authMiddleware, requireRole(["admin", "host"]), hostListingController.list);
router.post("/v1/host/listings", authMiddleware, requireRole(["admin", "host"]), csrfMiddleware, hostListingController.create);
router.get("/v1/host/listings/:id", authMiddleware, requireRole(["admin", "host"]), hostListingController.detail);
router.patch("/v1/host/listings/:id", authMiddleware, requireRole(["admin", "host"]), csrfMiddleware, hostListingController.update);
router.delete("/v1/host/listings/:id", authMiddleware, requireRole(["admin", "host"]), csrfMiddleware, hostListingController.destroy);
router.put("/v1/host/listings/:id/amenities", authMiddleware, requireRole(["admin", "host"]), csrfMiddleware, hostListingController.setAmenities);
router.post("/v1/host/listings/:id/submit", authMiddleware, requireRole(["admin", "host"]), csrfMiddleware, hostListingController.submit);
router.post("/v1/host/listings/:id/pause", authMiddleware, requireRole(["admin", "host"]), csrfMiddleware, hostListingController.pause);
router.post("/v1/host/listings/:id/resume", authMiddleware, requireRole(["admin", "host"]), csrfMiddleware, hostListingController.resume);

// Admin moderation (Sprint 3+)
const adminListingController = require("../controllers/api/v1/admin_listing.controller");
const adminUserController = require("../controllers/api/v1/admin_user.controller");
router.get("/v1/admin/listings", authMiddleware, requireRole(["admin"]), adminListingController.list);
router.post("/v1/admin/listings/:id/approve", authMiddleware, requireRole(["admin"]), csrfMiddleware, adminListingController.approve);
router.post("/v1/admin/listings/:id/reject", authMiddleware, requireRole(["admin"]), csrfMiddleware, adminListingController.reject);

router.get("/v1/admin/users", authMiddleware, requireRole(["admin"]), adminUserController.list);
router.patch("/v1/admin/users/:id/role", authMiddleware, requireRole(["admin"]), csrfMiddleware, adminUserController.setRole);


// Bookings + Payments (Sprint 4)
const bookingController = require("../controllers/api/v1/booking.controller");
const paymentController = require("../controllers/api/v1/payment.controller");

router.post("/v1/bookings", authMiddleware, csrfMiddleware, bookingController.create);
router.get("/v1/bookings/me", authMiddleware, bookingController.myBookings);
router.post("/v1/bookings/:id/cancel", authMiddleware, csrfMiddleware, bookingController.cancel);
router.post("/v1/bookings/:id/checkout", authMiddleware, csrfMiddleware, bookingController.checkout);

router.post(
  "/v1/bookings/:id/payments/vnpay",
  authMiddleware,
  csrfMiddleware,
  paymentController.createVnpay,
);

router.get("/v1/payments/vnpay/return", paymentController.vnpayReturn);
router.get("/v1/payments/vnpay/ipn", paymentController.vnpayIpn);
module.exports = router;
