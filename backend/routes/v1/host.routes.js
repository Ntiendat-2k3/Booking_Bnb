const express = require("express");
const router = express.Router();

const hostController = require("../../controllers/api/v1/host.controller");
const hostListingController = require("../../controllers/api/v1/host_listing.controller");
const hostListingImageController = require("../../controllers/api/v1/host_listing_image.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const requireRole = require("../../middlewares/api/role.middleware");

const hostOrAdmin = requireRole(["admin", "host"]);

// Dashboard & apply
router.get("/dashboard", authMiddleware, hostOrAdmin, hostController.getDashboardStats);
router.post("/apply", authMiddleware, csrfMiddleware, hostController.apply);

// Listings CRUD
router.get("/listings", authMiddleware, hostOrAdmin, hostListingController.list);
router.post("/listings", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.create);
router.get("/listings/:id", authMiddleware, hostOrAdmin, hostListingController.detail);
router.patch("/listings/:id", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.update);
router.delete("/listings/:id", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.destroy);
router.put("/listings/:id/amenities", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.setAmenities);
router.post("/listings/:id/submit", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.submit);
router.post("/listings/:id/pause", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.pause);
router.post("/listings/:id/resume", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.resume);

// Listing images
router.post("/listings/:id/images", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingImageController.attach);
router.delete("/listings/:id/images/:imageId", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingImageController.remove);
router.patch("/listings/:id/images/:imageId/cover", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingImageController.setCover);

// Contact host (public)
router.post("/:id/contact", hostController.contactHost);

module.exports = router;
