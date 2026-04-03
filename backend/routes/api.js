const express = require("express");
const router = express.Router();

// ── v1 route modules ─────────────────────────────────────
router.use("/v1/auth", require("./v1/auth.routes"));
router.use("/v1/users", require("./v1/account.routes"));
router.use("/v1", require("./v1/listing.routes"));
router.use("/v1/host", require("./v1/host.routes"));
router.use("/v1/hosts", require("./v1/host.routes")); // public contact endpoint
router.use("/v1/uploads", require("./v1/upload.routes"));
router.use("/v1", require("./v1/booking.routes"));
router.use("/v1/admin", require("./v1/admin.routes"));
router.use("/v1/notifications", require("./v1/notification.routes"));

module.exports = router;
