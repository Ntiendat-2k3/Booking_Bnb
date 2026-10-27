const chat = require("../../../services/chat.service");
const booking = require("../../../integrations/booking/chat.adapter");
const { successResponse } = require("../../../utils/response");
const asyncHandler = require("../../../utils/asyncHandler");
const socketTicket = require("../../../services/chat.socket-ticket");
const calls = require("../../../services/call.service");
const proposals = require("../../../services/booking_proposal.service");
const schema = require("../../../requests/api/v1/chat.schema");
const httpError = require("../../../utils/httpError");
const { promises: fs } = require("node:fs");
const { Readable } = require("node:stream");

module.exports = {
  socketTicket: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    return successResponse(res, { ticket: socketTicket.issue({ userId: req.user.user.id,
      sessionId: req.user.sessionId, accessExpiresAt: req.user.exp }) });
  }),
  list: asyncHandler(async (req, res) => successResponse(res, await chat.list(req.user.user.id, req.query))),
  unread: asyncHandler(async (req, res) => successResponse(res, { count: await chat.unreadTotal(req.user.user.id) })),
  detail: asyncHandler(async (req, res) => successResponse(res, await chat.detail(req.user.user.id, req.params.conversationId))),
  messages: asyncHandler(async (req, res) => successResponse(res,
    await chat.messages(req.user.user.id, req.params.conversationId, req.query))),
  proposalCandidates: asyncHandler(async (req, res) => successResponse(res,
    await proposals.candidates(req.user.user.id, req.user.user.role,
      req.params.conversationId, req.query.search))),
  proposalQuote: asyncHandler(async (req, res) => successResponse(res,
    await proposals.quote(req.user.user.id, req.user.user.role, req.params.conversationId, req.body))),
  createProposal: asyncHandler(async (req, res) => successResponse(res,
    await proposals.create(req.user.user.id, req.user.user.role, req.params.conversationId, req.body),
    "Proposal sent", 201)),
  proposalDetail: asyncHandler(async (req, res) => successResponse(res,
    await proposals.detail(req.user.user.id, req.params.conversationId, req.params.proposalId))),
  updateProposal: asyncHandler(async (req, res) => successResponse(res,
    await proposals.update(req.user.user.id, req.user.user.role, req.params.conversationId,
      req.params.proposalId, req.body))),
  confirmProposal: asyncHandler(async (req, res) => successResponse(res,
    await proposals.act(req.user.user.id, req.params.conversationId,
      req.params.proposalId, "confirm", req.body))),
  requestProposalChanges: asyncHandler(async (req, res) => successResponse(res,
    await proposals.act(req.user.user.id, req.params.conversationId,
      req.params.proposalId, "request-changes", req.body))),
  rejectProposal: asyncHandler(async (req, res) => successResponse(res,
    await proposals.act(req.user.user.id, req.params.conversationId,
      req.params.proposalId, "reject", req.body))),
  searchMessages: asyncHandler(async (req, res) => successResponse(res,
    await chat.searchMessages(req.user.user.id, req.params.conversationId, req.query.search, req.query))),
  sharedMessages: asyncHandler(async (req, res) => successResponse(res,
    await chat.sharedMessages(req.user.user.id, req.params.conversationId, req.query.type, req.query))),
  pinnedMessages: asyncHandler(async (req, res) => successResponse(res,
    await chat.pinnedMessages(req.user.user.id, req.params.conversationId))),
  setMessagePin: asyncHandler(async (req, res) => successResponse(res,
    await chat.setMessagePin(req.user.user.id, req.params.conversationId,
      req.params.messageId, req.body.pinned))),
  searchUsers: asyncHandler(async (req, res) => successResponse(res,
    await chat.searchUsers(req.user.user.id, req.query.search))),
  publicProfile: asyncHandler(async (req, res) => successResponse(res,
    await chat.publicProfile(req.user.user.id, req.params.userId))),
  setUserBlock: asyncHandler(async (req, res) => successResponse(res,
    await chat.setUserBlock(req.user.user.id, req.params.userId, req.body.blocked))),
  createDirect: asyncHandler(async (req, res) => successResponse(res,
    await chat.createDirect(req.user.user.id, req.params.userId), "Opened", 201)),
  send: asyncHandler(async (req, res) => successResponse(res,
    await chat.sendText(req.user.user.id, req.params.conversationId, req.body), "Sent", 201)),
  reaction: asyncHandler(async (req, res) => successResponse(res,
    await chat.setReaction(req.user.user.id, req.params.conversationId, req.params.messageId, req.body))),
  editMessage: asyncHandler(async (req, res) => successResponse(res,
    await chat.editMessage(req.user.user.id, req.params.conversationId, req.params.messageId, req.body.body))),
  recallMessage: asyncHandler(async (req, res) => successResponse(res,
    await chat.recallMessage(req.user.user.id, req.params.conversationId, req.params.messageId))),
  sendMedia: asyncHandler(async (req, res) => {
    try {
      const { error, value } = schema.sendMedia.validate(req.body, { stripUnknown: true });
      if (error) throw httpError(400, "Validation failed");
      return successResponse(res, await chat.sendMedia(req.user.user.id, req.params.conversationId,
        value, req.file), "Sent", 201);
    } finally {
      if (req.file) await fs.unlink(req.file.path).catch((error) => {
        if (error.code !== "ENOENT") console.error("[chat] Không thể xóa tệp tạm:", error.name);
      });
    }
  }),
  media: asyncHandler(async (req, res) => {
    res.set("Referrer-Policy", "no-referrer");
    const { url, mimeType, download } = await chat.mediaUrl(req.user.user.id,
      req.params.conversationId, req.params.messageId, req.params.fileIndex ?? null);
    const range = /^bytes=\d*-\d*$/.test(req.get("Range") || "") ? req.get("Range") : null;
    let upstream;
    try { upstream = await fetch(url, { headers: range ? { Range: range } : {} }); }
    catch { throw httpError(502, "Media unavailable"); }
    if (!upstream.ok || !upstream.body) throw httpError(502, "Media unavailable");
    res.status(upstream.status);
    res.set("Content-Type", mimeType);
    for (const header of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(header);
      if (value) res.set(header, value);
    }
    res.set("Content-Disposition", download ? `attachment; filename="chat-file.${mimeType === "application/pdf" ? "pdf" :
      mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1]}"` : "inline");
    res.set("X-Content-Type-Options", "nosniff");
    const stream = Readable.fromWeb(upstream.body);
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  }),
  read: asyncHandler(async (req, res) => successResponse(res,
    await chat.markRead(req.user.user.id, req.params.conversationId, req.body.message_id))),
  contact: asyncHandler(async (req, res) => successResponse(res,
    await booking.contactHost(req.user.user.id, req.params.listingId, req.body?.client_key))),
  createCall: asyncHandler(async (req, res) => successResponse(res,
    await calls.create(req.user.user.id, req.params.conversationId, req.body.instance_id), "Created", 201)),
  activeCall: asyncHandler(async (req, res) => successResponse(res,
    await calls.active(req.user.user.id))),
  getCall: asyncHandler(async (req, res) => successResponse(res,
    await calls.get(req.user.user.id, req.params.callId))),
  acceptCall: asyncHandler(async (req, res) => successResponse(res,
    await calls.command(req.user.user.id, req.params.callId, "accept", req.body.instance_id))),
  declineCall: asyncHandler(async (req, res) => successResponse(res,
    await calls.command(req.user.user.id, req.params.callId, "decline"))),
  cancelCall: asyncHandler(async (req, res) => successResponse(res,
    await calls.command(req.user.user.id, req.params.callId, "cancel"))),
  endCall: asyncHandler(async (req, res) => successResponse(res,
    await calls.command(req.user.user.id, req.params.callId, "end"))),
  reportCall: asyncHandler(async (req, res) => successResponse(res,
    await calls.report(req.user.user.id, req.params.callId, req.body.instance_id, req.body.connection))),
};
