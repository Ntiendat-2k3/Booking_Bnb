const express = require("express");
const router = express.Router();

const hostController = require("../../controllers/api/v1/host.controller");
const hostListingController = require("../../controllers/api/v1/host_listing.controller");
const hostListingImageController = require("../../controllers/api/v1/host_listing_image.controller");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const requireRole = require("../../middlewares/api/role.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const { idParams } = require("../../requests/api/v1/common.schema");
const { createListingSchema, updateListingSchema, amenitiesSchema, imageSchema } = require("../../requests/api/v1/listing.schema");
const { contactSchema, imageParams } = require("../../requests/api/v1/host.schema");
const { contactLimiter } = require("../../middlewares/rateLimit");

const hostOrAdmin = requireRole(["admin", "host"]);

router.get("/dashboard", authMiddleware, hostOrAdmin, hostController.getDashboardStats);
router.post("/apply", authMiddleware, csrfMiddleware, hostController.apply);

router.get("/listings", authMiddleware, hostOrAdmin, hostListingController.list);
router.post("/listings", authMiddleware, hostOrAdmin, csrfMiddleware, validate(createListingSchema), hostListingController.create);
router.get("/listings/:id", authMiddleware, hostOrAdmin, hostListingController.detail);
router.patch("/listings/:id", authMiddleware, hostOrAdmin, csrfMiddleware, validate(updateListingSchema), hostListingController.update);
router.delete("/listings/:id", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.destroy);
router.put("/listings/:id/amenities", authMiddleware, hostOrAdmin, csrfMiddleware, validate(amenitiesSchema), hostListingController.setAmenities);
router.post("/listings/:id/submit", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.submit);
router.post("/listings/:id/pause", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.pause);
router.post("/listings/:id/resume", authMiddleware, hostOrAdmin, csrfMiddleware, hostListingController.resume);

router.post("/listings/:id/images", authMiddleware, hostOrAdmin, csrfMiddleware, validate(idParams, "params"), validate(imageSchema), hostListingImageController.attach);
router.delete("/listings/:id/images/:imageId", authMiddleware, hostOrAdmin, csrfMiddleware, validate(imageParams, "params"), hostListingImageController.remove);
router.patch("/listings/:id/images/:imageId/cover", authMiddleware, hostOrAdmin, csrfMiddleware, validate(imageParams, "params"), hostListingImageController.setCover);

router.post("/:id/contact", contactLimiter, validate(idParams, "params"), validate(contactSchema), hostController.contactHost);

module.exports = router;
