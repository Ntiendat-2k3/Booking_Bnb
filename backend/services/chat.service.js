const chat = require("../repositories/chat.repository");
const httpError = require("../utils/httpError");
const socket = require("./chat.socket");
const { createHash, randomUUID } = require("node:crypto");
const { createReadStream } = require("node:fs");
const { uploadChatFile, chatDownloadUrl, destroy } = require("./cloudinary.service");
const { enqueue } = require("./background_job.service");
const chatMessageView = require("../utils/chatMessageView");

async function requireMember(userId, conversationId) {
  const member = await chat.member(conversationId, userId);
  if (!member) throw httpError(404, "Conversation not found");
  return member;
}

async function emitMessage(conversationId, message, event = "chat:message") {
  const payload = chatMessageView(message.toJSON());
  socket.emitToUsers((await chat.participants(conversationId)).map((row) => row.user_id), event, payload);
}

async function fileDigest(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

/** Xóa upload thừa sau race hoặc lỗi DB; worker thử lại nếu Cloudinary chưa sẵn sàng. */
async function discardMedia(publicId, resourceType) {
  try { await destroy(publicId, resourceType, "authenticated"); }
  catch {
    await enqueue("cloudinary_delete", { public_id: publicId, resource_type: resourceType,
      delivery_type: "authenticated" }).catch((error) =>
      console.error("[chat] Không thể lên lịch xóa media thừa:", error.name));
  }
}

module.exports = {
  requireMember,
  callPeer(userId, conversationId) { return chat.callPeer(userId, conversationId); },
  /** Mở hội thoại trực tiếp giữa hai tài khoản; thông tin phòng được chia sẻ riêng khi liên hệ chủ nhà. */
  async createDirect(userId, otherId) {
    if (userId === otherId) throw httpError(400, "Cannot message yourself");
    const { conversation, created } = await chat.findOrCreateDirect(userId, otherId);
    if (created) socket.emitToUsers([userId, otherId], "chat:conversation", { id: conversation.id });
    return conversation;
  },
  /** Mỗi lần liên hệ tạo thẻ phòng mới; cùng clientKey chỉ tạo một tin khi yêu cầu được thử lại. */
  async shareListing(userId, conversationId, listing, clientKey = randomUUID()) {
    const input = { conversationId, senderId: userId, type: "shared_context", context: listing };
    const result = await chat.createMessage({ ...input, clientKey: `listing:${clientKey}` });
    if (result.message.conversation_id !== conversationId || result.message.type !== "shared_context" ||
      result.message.context?.id !== listing.id) throw httpError(409, "Message key conflict");
    if (result.created) await emitMessage(conversationId, result.message);
  },
  async list(userId, options) {
    const result = await chat.list(userId, options);
    const online = await socket.onlineUsers(result.items.map((item) => item.other_id));
    return { ...result, items: result.items.map((item) => ({
      ...item, other_online: !item.blocked_by_me && !item.blocked_me && online.has(item.other_id),
    })) };
  },
  unreadTotal(userId) { return chat.unreadTotal(userId); },
  async detail(userId, conversationId) {
    await requireMember(userId, conversationId);
    const summary = await chat.summary(userId, conversationId);
    if (!summary) throw httpError(404, "Conversation not found");
    const online = await socket.onlineUsers([summary.other_id]);
    return { ...summary,
      other_online: !summary.blocked_by_me && !summary.blocked_me && online.has(summary.other_id) };
  },
  async messages(userId, conversationId, options) {
    const result = await chat.messages(conversationId, userId, options);
    return { ...result, items: result.items.map(chatMessageView) };
  },
  searchMessages(userId, conversationId, query, options) {
    return chat.searchMessages(conversationId, userId, query, options);
  },
  sharedMessages(userId, conversationId, type, options) {
    return chat.sharedMessages(conversationId, userId, type, options);
  },
  async pinnedMessages(userId, conversationId) {
    return (await chat.pinnedMessages(conversationId, userId)).map(chatMessageView);
  },
  async setMessagePin(userId, conversationId, messageId, active) {
    const result = await chat.setMessagePin(conversationId, messageId, userId, active);
    socket.emitToUsers((await chat.participants(conversationId)).map((row) => row.user_id),
      "chat:pin", result);
    return result;
  },
  searchUsers(userId, query) { return chat.searchUsers(userId, query); },
  async publicProfile(userId, targetId) {
    const profile = await chat.publicProfile(userId, targetId);
    return { ...profile.toJSON(), ...(await chat.blockStatus(userId, targetId)) };
  },
  async setUserBlock(userId, targetId, blocked) {
    const result = await chat.setUserBlock(userId, targetId, blocked);
    if (blocked) await require("./call.service").endBlockedPair(userId, targetId)
      .catch((error) => console.error("[chat] Không thể kết thúc cuộc gọi sau khi chặn:", error.name));
    socket.emitToUsers([userId, targetId], "chat:block",
      { user_id: userId, target_id: targetId, blocked });
    return result;
  },
  /** Sự kiện chỉ phát sau commit; client_key giúp retry không tạo tin nhắn thứ hai. */
  async sendText(userId, conversationId, { body, client_key, reply_to_message_id }) {
    await requireMember(userId, conversationId);
    const result = await chat.createMessage({ conversationId, senderId: userId,
      type: "text", body, clientKey: client_key, replyToId: reply_to_message_id });
    if (result.message.conversation_id !== conversationId || result.message.body !== body ||
      String(result.message.reply_to_id || "") !== String(reply_to_message_id || "")) {
      throw httpError(409, "Message key conflict");
    }
    if (result.created) await emitMessage(conversationId, result.message);
    return chatMessageView(result.message.toJSON());
  },
  /** Ảnh dưới 10 MB và ghi âm được lưu trên Cloudinary sau khi kiểm tra quyền. */
  async sendMedia(userId, conversationId, { client_key, reply_to_message_id }, file) {
    if (!file) throw httpError(400, "Media file is required");
    await requireMember(userId, conversationId);
    const type = file.mimetype.startsWith("image/") ? "image" : "audio";
    if (type === "image" && file.size >= 10 * 1024 * 1024) throw httpError(400, "Image too large");
    const sha256 = await fileDigest(file.path);
    const matches = (message) => message.conversation_id === conversationId && message.type === type &&
      message.context?.sha256 === sha256 &&
      String(message.reply_to_id || "") === String(reply_to_message_id || "");
    const existing = await chat.messageByClientKey(userId, client_key);
    if (existing) {
      if (!matches(existing)) throw httpError(409, "Message key conflict");
      return chatMessageView(existing.toJSON());
    }
    let uploaded;
    try {
      const publicId = `booking_bnb/chat/${conversationId}/${randomUUID()}`;
      uploaded = await uploadChatFile(file, publicId);
      const resourceType = type === "image" ? "image" : "video";
      if (uploaded.public_id !== publicId || uploaded.resource_type !== resourceType ||
        uploaded.type !== "authenticated") throw new Error("Chat media upload mismatch");
      const context = { public_id: publicId, resource_type: resourceType, format: uploaded.format,
        mime_type: file.mimetype, bytes: uploaded.bytes, sha256,
        ...(type === "image" ? { width: uploaded.width, height: uploaded.height } : {}) };
      const result = await chat.createMessage({ conversationId, senderId: userId, type,
        context, clientKey: client_key, replyToId: reply_to_message_id });
      if (!result.created) {
        if (!matches(result.message)) throw httpError(409, "Message key conflict");
        await discardMedia(uploaded.public_id, resourceType);
        uploaded = null;
        return chatMessageView(result.message.toJSON());
      }
      uploaded = null;
      await emitMessage(conversationId, result.message);
      return chatMessageView(result.message.toJSON());
    } catch (error) {
      if (uploaded) await discardMedia(uploaded.public_id, uploaded.resource_type || (type === "image" ? "image" : "video"));
      throw error;
    }
  },
  async mediaUrl(userId, conversationId, messageId, fileIndex = null) {
    await requireMember(userId, conversationId);
    const message = await chat.messageById(conversationId, messageId);
    if (!message || message.recalled_at) throw httpError(404, "Media not found");
    const fileRequest = fileIndex !== null;
    if (fileRequest && (message.type !== "file" || !Number.isInteger(Number(fileIndex)) ||
      Number(fileIndex) < 0 || Number(fileIndex) > 4)) throw httpError(404, "Media not found");
    const media = fileRequest ? message.context?.files?.[Number(fileIndex)] : message.context;
    if ((!fileRequest && !["image", "audio", "video"].includes(message.type)) ||
      !media?.public_id?.startsWith(`booking_bnb/chat/${conversationId}/`) ||
      !/^[a-z0-9]+$/.test(media.format || "") ||
      !(fileRequest ? ["application/pdf", "image/jpeg", "image/png", "image/webp"] :
        message.type === "image" ? ["image/jpeg", "image/png", "image/webp"] :
          message.type === "video" ? ["video/mp4", "video/webm", "video/quicktime"] :
            ["audio/webm", "audio/ogg", "audio/mp4"]).includes(media.mime_type) ||
      media.resource_type !== (fileRequest ? media.mime_type === "application/pdf" ? "raw" : "image" :
        message.type === "image" ? "image" : "video") ||
      (media.resource_type === "raw" && !media.public_id.endsWith(".pdf"))) {
      throw httpError(404, "Media not found");
    }
    return { url: chatDownloadUrl(media.public_id, media.format, media.resource_type),
      mimeType: media.mime_type, download: fileRequest };
  },
  async setReaction(userId, conversationId, messageId, input) {
    await requireMember(userId, conversationId);
    const result = await chat.setReaction(conversationId, messageId, userId, input.emoji, input.active);
    socket.emitToUsers((await chat.participants(conversationId)).map((row) => row.user_id),
      "chat:reaction", result);
    return result;
  },
  async editMessage(userId, conversationId, messageId, body) {
    await requireMember(userId, conversationId);
    const message = await chat.editMessage(conversationId, messageId, userId, body);
    await emitMessage(conversationId, message, "chat:message:update");
    return chatMessageView(message.toJSON());
  },
  async recallMessage(userId, conversationId, messageId) {
    await requireMember(userId, conversationId);
    const previous = await chat.messageById(conversationId, messageId);
    const message = await chat.recallMessage(conversationId, messageId, userId);
    if (previous && !previous.recalled_at) {
      const media = previous.type === "file" ? previous.context?.files || [] :
        ["image", "audio", "video"].includes(previous.type) ? [previous.context] : [];
      await Promise.all(media.filter((entry) => entry?.public_id && entry?.resource_type)
        .map((entry) => discardMedia(entry.public_id, entry.resource_type)));
    }
    await emitMessage(conversationId, message, "chat:message:update");
    socket.emitToUsers((await chat.participants(conversationId)).map((row) => row.user_id),
      "chat:pin", { conversation_id: conversationId, message_id: messageId, pinned: false });
    return chatMessageView(message.toJSON());
  },
  /** Cursor chỉ tiến đến một tin nhắn thuộc hội thoại của người đọc. */
  async markRead(userId, conversationId, messageId) {
    await requireMember(userId, conversationId);
    const message = await chat.messageById(conversationId, messageId);
    if (!message) throw httpError(404, "Message not found");
    const member = await chat.markRead(conversationId, userId, message.sequence);
    socket.emitToUsers((await chat.participants(conversationId)).map((row) => row.user_id),
      "chat:read", { conversation_id: conversationId, user_id: userId,
        sequence: member.last_read_sequence });
    return { sequence: member.last_read_sequence };
  },
};
