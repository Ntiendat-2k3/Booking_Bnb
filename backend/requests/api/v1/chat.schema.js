const Joi = require("joi");
const { uuid } = require("./common.schema");

const conversationParams = Joi.object({ conversationId: uuid.required() });
const listingParams = Joi.object({ listingId: uuid.required() });
const listQuery = Joi.object({
  search: Joi.string().trim().max(100).allow("").default(""),
  page: Joi.number().integer().min(1).max(100000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});
const messagesQuery = Joi.object({
  before: Joi.string().pattern(/^[1-9][0-9]{0,18}$/).custom((value, helpers) =>
    BigInt(value) <= 9223372036854775807n ? value : helpers.error("any.invalid")),
  limit: Joi.number().integer().min(1).max(50).default(30),
});
const searchUsersQuery = Joi.object({ search: Joi.string().trim().min(2).max(80).required() });
const userParams = Joi.object({ userId: uuid.required() });
const blockState = Joi.object({ blocked: Joi.boolean().required() });
const contentQuery = Joi.object({ search: Joi.string().trim().min(2).max(100).required(),
  page: Joi.number().integer().min(1).max(100000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(30) });
const sharedQuery = Joi.object({ type: Joi.string().valid("image", "video", "file", "link").required(),
  page: Joi.number().integer().min(1).max(100000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(30) });
const pinState = Joi.object({ pinned: Joi.boolean().required() });
const sendMessage = Joi.object({
  body: Joi.string().trim().min(1).max(4000).required(),
  client_key: Joi.string().guid({ version: "uuidv4" }).required(),
  reply_to_message_id: uuid.optional(),
});
const contactListing = Joi.object({ client_key: sendMessage.extract("client_key").optional() });
const readMessage = Joi.object({ message_id: uuid.required() });
const mediaParams = Joi.object({ conversationId: uuid.required(), messageId: uuid.required() });
const fileParams = Joi.object({ conversationId: uuid.required(), messageId: uuid.required(),
  fileIndex: Joi.number().integer().min(0).max(4).required() });
const sendMedia = Joi.object({
  client_key: sendMessage.extract("client_key").required(),
  reply_to_message_id: uuid.optional(),
});
const reactionParams = Joi.object({ conversationId: uuid.required(), messageId: uuid.required() });
const setReaction = Joi.object({
  emoji: Joi.string().valid("❤️", "👍", "😂", "😮", "🙏").required(),
  active: Joi.boolean().required(),
});
const editMessage = Joi.object({ body: sendMessage.extract("body").required() });
const callParams = Joi.object({ callId: uuid.required() });
const createCall = Joi.object({ instance_id: Joi.string().guid({ version: "uuidv4" }).required() });
const acceptCall = createCall;
const reportCall = Joi.object({
  instance_id: Joi.string().guid({ version: "uuidv4" }).required(),
  connection: Joi.string().valid("connected", "disconnected", "failed").required(),
});
const emptyCallBody = Joi.object({});

const signalingDescription = Joi.object({
  type: Joi.string().valid("offer", "answer").required(),
  sdp: Joi.string().max(65536).required(),
});
const signalingCandidate = Joi.object({
  candidate: Joi.string().max(4096).required(),
  sdpMid: Joi.string().allow(null).max(256),
  sdpMLineIndex: Joi.number().integer().min(0).max(256).allow(null),
  usernameFragment: Joi.string().max(256).allow(null),
});
const signalOffer = Joi.object({ call_id: uuid.required(), instance_id: createCall.extract("instance_id").required(),
  description: signalingDescription.required() });
const signalCandidate = Joi.object({ call_id: uuid.required(), instance_id: createCall.extract("instance_id").required(),
  candidate: signalingCandidate.required() });

module.exports = { conversationParams, listingParams, listQuery, messagesQuery, sendMessage, sendMedia,
  contactListing, searchUsersQuery, userParams, blockState, contentQuery, sharedQuery, pinState,
  mediaParams, fileParams, readMessage, reactionParams, setReaction, editMessage,
  callParams, createCall, acceptCall, reportCall, emptyCallBody, signalOffer, signalCandidate };
