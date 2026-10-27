const express = require("express");
const router = express.Router();

const hostController = require("../../controllers/api/v1/host.controller");
const hostListingController = require("../../controllers/api/v1/host_listing.controller");
const hostListingImageController = require("../../controllers/api/v1/host_listing_image.controller");
const calendarController = require("../../controllers/api/v1/calendar.controller");
const pricingController = require("../../controllers/api/v1/pricing.controller");
const stayController = require("../../controllers/api/v1/booking-stay.controller");
const propertyPaymentController = require("../../controllers/api/v1/property-payment.controller");
const propertySchema = require("../../requests/api/v1/property-payment.schema");
const authMiddleware = require("../../middlewares/api/auth.middleware");
const csrfMiddleware = require("../../middlewares/csrf.middleware");
const requireRole = require("../../middlewares/api/role.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const { idParams } = require("../../requests/api/v1/common.schema");
const { createListingSchema, updateListingSchema, amenitiesSchema, imageSchema } = require("../../requests/api/v1/listing.schema");
const { contactSchema, imageParams } = require("../../requests/api/v1/host.schema");
const { calendarQuery, blockCalendar, unblockCalendar, publicCalendarVisibility,
  weekdayPrices, dailyPrice, pricingRange, removePricingRange } = require("../../requests/api/v1/calendar.schema");
const { scanQrSchema, manualStaySchema, hostStayQuery, stayEventsQuery } = require("../../requests/api/v1/booking-stay.schema");
const { contactLimiter, stayQrScanLimiter } = require("../../middlewares/rateLimit");
const { analyticsQuery } = require("../../requests/api/v1/analytics.schema");

const hostOrAdmin = requireRole(["admin", "host"]);

router.get("/dashboard", authMiddleware, hostOrAdmin, hostController.getDashboardStats);
router.get("/dashboard/analytics", authMiddleware, hostOrAdmin,
  validate(analyticsQuery, "query"), hostController.analytics);
router.get("/dashboard/analytics.csv", authMiddleware, hostOrAdmin,
  validate(analyticsQuery, "query"), hostController.analyticsCsv);
router.get("/calendar", authMiddleware, hostOrAdmin, validate(calendarQuery, "query"), calendarController.host);
router.patch("/calendar/visibility", authMiddleware, hostOrAdmin, csrfMiddleware, validate(publicCalendarVisibility), calendarController.setPublicVisibility);
router.post("/calendar/blocks", authMiddleware, hostOrAdmin, csrfMiddleware, validate(blockCalendar), calendarController.block);
router.delete("/calendar/blocks", authMiddleware, hostOrAdmin, csrfMiddleware, validate(unblockCalendar), calendarController.unblock);
router.put("/calendar/pricing/weekdays", authMiddleware, hostOrAdmin, csrfMiddleware, validate(weekdayPrices), pricingController.weekdays);
router.put("/calendar/pricing/day", authMiddleware, hostOrAdmin, csrfMiddleware, validate(dailyPrice), pricingController.day);
router.post("/calendar/pricing/ranges", authMiddleware, hostOrAdmin, csrfMiddleware, validate(pricingRange), pricingController.addRange);
router.delete("/calendar/pricing/ranges/:id", authMiddleware, hostOrAdmin, csrfMiddleware,
  validate(idParams, "params"), validate(removePricingRange, "query"), pricingController.removeRange);
router.get("/stays", authMiddleware, hostOrAdmin, validate(hostStayQuery, "query"), stayController.hostList);
router.get("/collections", authMiddleware, hostOrAdmin, validate(propertySchema.report, "query"), propertyPaymentController.report);
router.post("/collections/:id/reconcile", authMiddleware, requireRole(["admin", "super_admin"]), csrfMiddleware,
  validate(idParams, "params"), propertyPaymentController.reconcile);
router.post("/stays/:id/collect-payment", authMiddleware, hostOrAdmin, csrfMiddleware,
  validate(idParams, "params"), validate(propertySchema.collect), propertyPaymentController.collect);
router.post("/stays/:id/no-show", authMiddleware, hostOrAdmin, csrfMiddleware,
  validate(idParams, "params"), validate(propertySchema.noShow), propertyPaymentController.noShow);
router.post("/stays/inspect", authMiddleware, hostOrAdmin, stayQrScanLimiter, csrfMiddleware, validate(scanQrSchema), stayController.inspect);
router.post("/stays/confirm", authMiddleware, hostOrAdmin, stayQrScanLimiter, csrfMiddleware, validate(scanQrSchema), stayController.confirm);
router.post("/stays/:id/manual", authMiddleware, hostOrAdmin, csrfMiddleware,
  validate(idParams, "params"), validate(manualStaySchema), stayController.manual);
router.get("/stays/:id/events", authMiddleware, hostOrAdmin,
  validate(idParams, "params"), validate(stayEventsQuery, "query"), stayController.events);
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
