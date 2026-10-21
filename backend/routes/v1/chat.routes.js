const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../../middlewares/api/auth.middleware");
const csrf = require("../../middlewares/csrf.middleware");
const validate = require("../../middlewares/api/validation.middleware");
const schema = require("../../requests/api/v1/chat.schema");
const controller = require("../../controllers/api/v1/chat.controller");
const { chatUpload, uploadErrorHandler } = require("../../middlewares/upload.middleware");
const { uploadLimiter } = require("../../middlewares/rateLimit");

const router = express.Router();
const writeLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.user.user.id });
const readLimit = rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.user.user.id });
const downloadLimit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.user.user.id });
router.use(auth);
router.use((req, res, next) => { res.set("Cache-Control", "private, no-store"); next(); });
router.use(readLimit);
router.get("/socket-ticket", writeLimit, controller.socketTicket);
router.get("/unread", controller.unread);
router.get("/users", validate(schema.searchUsersQuery, "query"), controller.searchUsers);
router.get("/users/:userId", validate(schema.userParams, "params"), controller.publicProfile);
router.put("/users/:userId/block", csrf, writeLimit,
  validate(schema.userParams, "params"), validate(schema.blockState), controller.setUserBlock);
router.post("/users/:userId/conversation", csrf, writeLimit,
  validate(schema.userParams, "params"), controller.createDirect);
router.get("/calls/active", controller.activeCall);
router.get("/calls/:callId", validate(schema.callParams, "params"), controller.getCall);
router.post("/calls/:callId/accept", csrf, writeLimit, validate(schema.callParams, "params"), validate(schema.acceptCall), controller.acceptCall);
router.post("/calls/:callId/decline", csrf, writeLimit, validate(schema.callParams, "params"), validate(schema.emptyCallBody), controller.declineCall);
router.post("/calls/:callId/cancel", csrf, writeLimit, validate(schema.callParams, "params"), validate(schema.emptyCallBody), controller.cancelCall);
router.post("/calls/:callId/end", csrf, writeLimit, validate(schema.callParams, "params"), validate(schema.emptyCallBody), controller.endCall);
router.post("/calls/:callId/report-connection", csrf, writeLimit, validate(schema.callParams, "params"), validate(schema.reportCall), controller.reportCall);
router.get("/", validate(schema.listQuery, "query"), controller.list);
router.post("/listings/:listingId", csrf, writeLimit,
  validate(schema.listingParams, "params"), validate(schema.contactListing), controller.contact);
router.post("/:conversationId/calls", csrf, writeLimit, validate(schema.conversationParams, "params"), validate(schema.createCall), controller.createCall);
router.get("/:conversationId", validate(schema.conversationParams, "params"), controller.detail);
router.get("/:conversationId/messages", validate(schema.conversationParams, "params"), validate(schema.messagesQuery, "query"), controller.messages);
router.get("/:conversationId/messages/search", validate(schema.conversationParams, "params"),
  validate(schema.contentQuery, "query"), controller.searchMessages);
router.get("/:conversationId/shared", validate(schema.conversationParams, "params"),
  validate(schema.sharedQuery, "query"), controller.sharedMessages);
router.get("/:conversationId/pins", validate(schema.conversationParams, "params"), controller.pinnedMessages);
router.put("/:conversationId/messages/:messageId/pin", csrf, writeLimit,
  validate(schema.reactionParams, "params"), validate(schema.pinState), controller.setMessagePin);
router.get("/:conversationId/messages/:messageId/media", downloadLimit,
  validate(schema.mediaParams, "params"), controller.media);
router.get("/:conversationId/messages/:messageId/files/:fileIndex", downloadLimit,
  validate(schema.fileParams, "params"), controller.media);
router.put("/:conversationId/messages/:messageId/reaction", csrf, writeLimit,
  validate(schema.reactionParams, "params"), validate(schema.setReaction), controller.reaction);
router.patch("/:conversationId/messages/:messageId", csrf, writeLimit,
  validate(schema.mediaParams, "params"), validate(schema.editMessage), controller.editMessage);
router.post("/:conversationId/messages/:messageId/recall", csrf, writeLimit,
  validate(schema.mediaParams, "params"), controller.recallMessage);
router.post("/:conversationId/messages", csrf, writeLimit, validate(schema.conversationParams, "params"), validate(schema.sendMessage), controller.send);
router.post("/:conversationId/messages/media", csrf, uploadLimiter, validate(schema.conversationParams, "params"),
  chatUpload.single("media"), uploadErrorHandler, controller.sendMedia);
router.patch("/:conversationId/read", csrf, writeLimit, validate(schema.conversationParams, "params"), validate(schema.readMessage), controller.read);

module.exports = router;
