const express = require("express");
const router = express.Router();

const adminListingController = require("../../controllers/api/v1/admin_listing.controller");
const adminUserController = require("../../controllers/api/v1/admin_user.controller");
const adminDashboardController = require("../../controllers/api/v1/admin_dashboard.controller");
const adminAmenityController = require("../../controllers/api/v1/admin_amenity.controller");
const adminBookingController = require("../../controllers/api/v1/admin_booking.controller");
const adminPaymentController = require("../../controllers/api/v1/admin_payment.controller");
const adminReviewController = require("../../controllers/api/v1/admin_review.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const requireRole = require("../../middlewares/api/role.middleware");
const { cache } = require("../../core/cache");
const validate = require("../../middlewares/api/validation.middleware");
const { bookingQuerySchema, paymentQuerySchema, reviewQuerySchema } = require("../../requests/api/v1/admin.schema");
const { idParams } = require("../../requests/api/v1/common.schema");

const adminOnly = [authMiddleware, requireRole(["admin"])];
const adminWrite = [...adminOnly, csrfMiddleware];

router.get("/dashboard/stats", ...adminOnly, cache(60), adminDashboardController.getStats);

router.get("/listings", ...adminOnly, adminListingController.list);
router.post("/listings/:id/approve", ...adminWrite, adminListingController.approve);
router.post("/listings/:id/reject", ...adminWrite, adminListingController.reject);
router.post("/listings/bulk-approve", ...adminWrite, adminListingController.bulkApprove);
router.post("/listings/bulk-reject", ...adminWrite, adminListingController.bulkReject);

router.get("/users", ...adminOnly, adminUserController.list);
router.patch("/users/:id/role", ...adminWrite, adminUserController.setRole);

router.get("/amenities", ...adminOnly, adminAmenityController.list);
router.post("/amenities", ...adminWrite, adminAmenityController.create);
router.patch("/amenities/:id", ...adminWrite, adminAmenityController.update);
router.post("/amenities/:id/active", ...adminWrite, adminAmenityController.setActive);

router.get("/bookings", ...adminOnly, validate(bookingQuerySchema, "query"), adminBookingController.list);
router.get("/bookings/:id", ...adminOnly, validate(idParams, "params"), adminBookingController.detail);

router.get("/payments", ...adminOnly, validate(paymentQuerySchema, "query"), adminPaymentController.list);
router.get("/payments/:id", ...adminOnly, validate(idParams, "params"), adminPaymentController.detail);

router.get("/reviews", ...adminOnly, validate(reviewQuerySchema, "query"), adminReviewController.list);
router.post("/reviews/:id/hide", ...adminWrite, adminReviewController.hide);
router.post("/reviews/:id/unhide", ...adminWrite, adminReviewController.unhide);
router.delete("/reviews/:id", ...adminWrite, adminReviewController.remove);
router.post("/reviews/bulk-hide", ...adminWrite, adminReviewController.bulkHide);
router.post("/reviews/bulk-unhide", ...adminWrite, adminReviewController.bulkUnhide);
router.post("/reviews/bulk-delete", ...adminWrite, adminReviewController.bulkRemove);

module.exports = router;
