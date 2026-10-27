const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../../controllers/api/v1/ai_search.controller");
const validate = require("../../middlewares/api/validation.middleware");
const csrf = require("../../middlewares/csrf.middleware");
const auth = require("../../middlewares/api/auth.middleware");
const requireRole = require("../../middlewares/api/role.middleware");
const { idParams } = require("../../requests/api/v1/common.schema");
const { searchRequest, searchClick, searchBooking } = require("../../requests/api/v1/ai-search.schema");

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

router.post("/search", limiter, csrf, validate(searchRequest), controller.search);
router.post("/:id/click", limiter, csrf, validate(idParams, "params"), validate(searchClick), controller.click);
router.post("/:id/booking", auth, csrf, validate(idParams, "params"), validate(searchBooking), controller.booking);
router.get("/metrics", auth, requireRole(["admin"]), controller.metrics);

module.exports = router;
