const { ChatConversation, ChatParticipant, ChatMessage, ChatMessageReaction, ChatMessagePin,
  ChatUserBlock, Notification, NotificationPreference, User, sequelize, Sequelize } = require("../models");
const httpError = require("../utils/httpError");

const { Op } = Sequelize;
const messageIncludes = [
  { association: "sender", attributes: ["full_name"] },
  { association: "replyTo", attributes: ["id", "sender_id", "type", "body", "recalled_at"],
    include: [{ association: "sender", attributes: ["full_name"] }] },
  { association: "reactions", attributes: ["user_id", "emoji"] },
];

/** Mọi thao tác với tin nhắn xác thực lại thành viên trong transaction. */
async function assertMember(conversationId, userId, transaction) {
  const member = await ChatParticipant.findOne({ where: { conversation_id: conversationId, user_id: userId },
    include: [{ model: User, as: "user", required: true, where: { status: "active" }, attributes: [] }],
    transaction, lock: transaction.LOCK.SHARE });
  const conversation = member && await ChatConversation.findOne({ where: { id: conversationId, kind: "direct" },
    attributes: ["id"], transaction });
  if (!conversation) throw httpError(404, "Conversation not found");
  return member;
}

/** Khóa tài khoản theo cùng thứ tự với thao tác chặn để lời gọi và tin nhắn không vượt qua lệnh chặn. */
async function assertUnblocked(firstId, secondId, transaction) {
  const users = await User.findAll({ where: { id: [firstId, secondId], status: "active" },
    attributes: ["id"], order: [["id", "ASC"]], transaction, lock: transaction.LOCK.SHARE });
  if (users.length !== 2) throw httpError(404, "User not found");
  const blocked = await ChatUserBlock.count({ where: { [Op.or]: [
    { blocker_id: firstId, blocked_id: secondId },
    { blocker_id: secondId, blocked_id: firstId },
  ] }, transaction });
  if (blocked) throw httpError(403, "CHAT_BLOCKED");
}

async function peerId(conversationId, userId, transaction) {
  const peer = await ChatParticipant.findOne({ where: { conversation_id: conversationId,
    user_id: { [Op.ne]: userId } }, attributes: ["user_id"], transaction });
  if (!peer) throw httpError(404, "Conversation not found");
  return peer.user_id;
}

const summarySql = `SELECT c.id, c.kind, c.created_at, c.last_activity_at,
  other.user_id AS other_id,
  u.full_name AS other_name, u.avatar_url AS other_avatar,
  last.id AS last_message_id, last.type AS last_message_type, last.body AS last_message_body,
  last.recalled_at AS last_message_recalled_at, last.created_at AS last_message_at,
  (SELECT COUNT(*)::integer FROM chat_messages unread
    WHERE unread.conversation_id = c.id AND unread.sequence > mine.last_read_sequence
      AND unread.sender_id <> :userId AND unread.type <> 'call') AS unread_count,
  EXISTS(SELECT 1 FROM chat_user_blocks b
    WHERE b.blocker_id = :userId AND b.blocked_id = other.user_id) AS blocked_by_me,
  EXISTS(SELECT 1 FROM chat_user_blocks b
    WHERE b.blocker_id = other.user_id AND b.blocked_id = :userId) AS blocked_me
  FROM chat_conversations c
  JOIN chat_participants mine ON mine.conversation_id = c.id AND mine.user_id = :userId
  JOIN chat_participants other ON other.conversation_id = c.id AND other.user_id <> :userId
  JOIN users u ON u.id = other.user_id AND u.status = 'active' AND u.deleted_at IS NULL
  LEFT JOIN LATERAL (SELECT id, type, body, recalled_at, created_at FROM chat_messages
    WHERE conversation_id = c.id ORDER BY sequence DESC LIMIT 1) last ON true
  WHERE c.kind = 'direct'`;

function messagePage(rows, limit, page) {
  return { items: rows.slice(0, limit).map((row) => row.toJSON()),
    hasMore: rows.length > limit, page };
}

module.exports = {
  /** Khóa cặp tài khoản và unique direct_key tránh tạo trùng hội thoại khi hai người cùng bắt đầu chat. */
  async findOrCreateDirect(userId, otherId) {
    if (userId === otherId) throw httpError(400, "Cannot message yourself");
    const directKey = [userId, otherId].sort().join(":");
    return sequelize.transaction(async (transaction) => {
      await assertUnblocked(userId, otherId, transaction);
      const [conversation, created] = await ChatConversation.findOrCreate({
        where: { direct_key: directKey },
        defaults: { kind: "direct", created_by: userId, last_activity_at: new Date() },
        transaction,
      });
      if (conversation.kind !== "direct") throw httpError(409, "Conversation key conflict");
      if (created) await ChatParticipant.bulkCreate([userId, otherId].map((id) => ({
        conversation_id: conversation.id, user_id: id, joined_at: new Date(),
      })), { transaction });
      return { conversation, created };
    });
  },
  member(conversationId, userId) {
    return ChatParticipant.findOne({ where: { conversation_id: conversationId, user_id: userId },
      include: [{ model: User, as: "user", required: true, where: { status: "active" }, attributes: [] },
        { model: ChatConversation, as: "conversation", required: true, where: { kind: "direct" },
          attributes: [] }] });
  },
  async callPeer(userId, conversationId) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      const otherId = await peerId(conversationId, userId, transaction);
      await assertUnblocked(userId, otherId, transaction);
      return otherId;
    });
  },
  /** Kiểm tra hai bên trong transaction đang ghi để lệnh chặn không vượt qua thao tác đặt phòng. */
  async assertActivePair(conversationId, userId, transaction) {
    await assertMember(conversationId, userId, transaction);
    const otherId = await peerId(conversationId, userId, transaction);
    await assertUnblocked(userId, otherId, transaction);
    return otherId;
  },
  participants(conversationId, transaction) {
    return sequelize.query(`SELECT p.user_id FROM chat_participants p
      JOIN users u ON u.id = p.user_id AND u.status = 'active' AND u.deleted_at IS NULL
      JOIN chat_conversations c ON c.id = p.conversation_id AND c.kind = 'direct'
      WHERE p.conversation_id = :conversationId`, {
      replacements: { conversationId }, type: Sequelize.QueryTypes.SELECT, transaction,
    });
  },
  async peerIds(userId) {
    const rows = await sequelize.query(`SELECT DISTINCT peer.user_id
      FROM chat_participants mine
      JOIN chat_conversations c ON c.id = mine.conversation_id AND c.kind = 'direct'
      JOIN chat_participants peer ON peer.conversation_id = c.id AND peer.user_id <> :userId
      JOIN users u ON u.id = peer.user_id AND u.status = 'active' AND u.deleted_at IS NULL
      WHERE mine.user_id = :userId
        AND NOT EXISTS (SELECT 1 FROM chat_user_blocks b
          WHERE (b.blocker_id = :userId AND b.blocked_id = peer.user_id)
             OR (b.blocker_id = peer.user_id AND b.blocked_id = :userId))`, {
      replacements: { userId }, type: Sequelize.QueryTypes.SELECT,
    });
    return rows.map((row) => row.user_id);
  },
  async summary(userId, conversationId) {
    const rows = await sequelize.query(`${summarySql} AND c.id = :conversationId`, {
      replacements: { userId, conversationId }, type: Sequelize.QueryTypes.SELECT,
    });
    return rows[0] || null;
  },
  async list(userId, { search = "", page = 1, limit = 20 }) {
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await sequelize.query(`${summarySql}
      AND (:search = '' OR u.full_name ILIKE :pattern ESCAPE '\\')
      ORDER BY c.last_activity_at DESC, c.id DESC LIMIT :limit OFFSET :offset`, {
      replacements: { userId, search, pattern, limit: limit + 1, offset: (page - 1) * limit },
      type: Sequelize.QueryTypes.SELECT,
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit, page };
  },
  async unreadTotal(userId) {
    const rows = await sequelize.query(`SELECT COUNT(*)::integer AS count FROM chat_messages m
      JOIN chat_participants p ON p.conversation_id = m.conversation_id AND p.user_id = :userId
      JOIN chat_conversations c ON c.id = p.conversation_id AND c.kind = 'direct'
      JOIN chat_participants other ON other.conversation_id = c.id AND other.user_id <> :userId
      JOIN users u ON u.id = other.user_id AND u.status = 'active' AND u.deleted_at IS NULL
      WHERE m.sequence > p.last_read_sequence AND m.sender_id <> :userId AND m.type <> 'call'`, {
      replacements: { userId }, type: Sequelize.QueryTypes.SELECT,
    });
    return rows[0].count;
  },
  async messages(conversationId, userId, { before, limit = 30 }) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      const where = { conversation_id: conversationId };
      if (before) where.sequence = { [Op.lt]: before };
      const rows = await ChatMessage.findAll({ where, include: messageIncludes,
        order: [["sequence", "DESC"]], limit: limit + 1, transaction });
      return { items: rows.slice(0, limit).reverse().map((row) => row.toJSON()),
        hasMore: rows.length > limit,
        nextCursor: rows.length > limit ? String(rows[limit - 1].sequence) : null };
    });
  },
  messageById(conversationId, id) {
    return ChatMessage.findOne({ where: { conversation_id: conversationId, id } });
  },
  messageByClientKey(senderId, clientKey) {
    return ChatMessage.findOne({ where: { sender_id: senderId, client_key: clientKey },
      include: messageIncludes });
  },
  /** Tin nhắn và thông báo được ghi cùng transaction; client_key bảo đảm retry không gửi trùng. */
  async createMessage({ conversationId, senderId, type, body = null, context = null,
    clientKey, replyToId = null, transaction: existingTransaction }) {
    const createInTransaction = async (transaction) => {
      await assertMember(conversationId, senderId, transaction);
      const otherId = await peerId(conversationId, senderId, transaction);
      await assertUnblocked(senderId, otherId, transaction);
      const previous = await ChatMessage.findOne({ where: { sender_id: senderId, client_key: clientKey }, transaction });
      if (!previous && replyToId) {
        const target = await ChatMessage.findOne({ where: { id: replyToId, conversation_id: conversationId },
          transaction, lock: transaction.LOCK.SHARE });
        if (!target || target.recalled_at || target.type === "call") throw httpError(404, "Reply target not available");
      }
      const [message, created] = await ChatMessage.findOrCreate({
        where: { sender_id: senderId, client_key: clientKey },
        defaults: { conversation_id: conversationId, type, body, context, reply_to_id: replyToId },
        transaction,
      });
      if (created) {
        await ChatConversation.update({ last_activity_at: message.created_at }, {
          where: { id: conversationId, last_activity_at: { [Op.lt]: message.created_at } }, transaction,
        });
        const preference = await NotificationPreference.findOne({
          where: { user_id: otherId }, attributes: ["messages"], transaction });
        if (preference?.messages !== false) await Notification.create({
          user_id: otherId, type: "message_received", title: "Tin nhắn mới",
          message: "Bạn có tin nhắn mới.", resource_type: "conversation",
          resource_id: conversationId, dedupe_key: `message:${message.id}`,
        }, { transaction });
      }
      return { message: await ChatMessage.findByPk(message.id, { include: messageIncludes, transaction }), created };
    };
    return existingTransaction ? createInTransaction(existingTransaction) :
      sequelize.transaction(createInTransaction);
  },
  async setReaction(conversationId, messageId, userId, emoji, active) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      await assertUnblocked(userId, await peerId(conversationId, userId, transaction), transaction);
      const message = await ChatMessage.findOne({ where: { id: messageId, conversation_id: conversationId },
        transaction, lock: transaction.LOCK.UPDATE });
      if (!message || message.recalled_at || message.type === "call") throw httpError(404, "Message not available");
      const where = { message_id: messageId, user_id: userId, emoji };
      if (active) await ChatMessageReaction.findOrCreate({ where, defaults: where, transaction });
      else await ChatMessageReaction.destroy({ where, transaction });
      return { conversation_id: conversationId, message_id: messageId, user_id: userId, emoji, active };
    });
  },
  async editMessage(conversationId, messageId, userId, body) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      await assertUnblocked(userId, await peerId(conversationId, userId, transaction), transaction);
      const message = await ChatMessage.findOne({ where: { id: messageId, conversation_id: conversationId },
        transaction, lock: transaction.LOCK.UPDATE });
      if (!message) throw httpError(404, "Message not found");
      if (message.sender_id !== userId) throw httpError(403, "MESSAGE_NOT_OWNED");
      if (message.type !== "text" || message.recalled_at) throw httpError(409, "MESSAGE_NOT_EDITABLE");
      await message.update({ body, edited_at: new Date(), revision: message.revision + 1 }, { transaction });
      return ChatMessage.findByPk(message.id, { include: messageIncludes, transaction });
    });
  },
  /** Thu hồi giữ nguyên ID và sequence để lịch sử cùng thứ tự ở cả hai phía. */
  async recallMessage(conversationId, messageId, userId) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      await assertUnblocked(userId, await peerId(conversationId, userId, transaction), transaction);
      const message = await ChatMessage.findOne({ where: { id: messageId, conversation_id: conversationId },
        transaction, lock: transaction.LOCK.UPDATE });
      if (!message || ["call", "booking_proposal"].includes(message.type))
        throw httpError(404, "Message not found");
      if (message.sender_id !== userId) throw httpError(403, "MESSAGE_NOT_OWNED");
      if (!message.recalled_at) {
        await message.update({ body: null, context: null, recalled_at: new Date(), recalled_by: userId,
          revision: message.revision + 1 }, { transaction });
        await ChatMessagePin.destroy({ where: { message_id: messageId }, transaction });
      }
      return ChatMessage.findByPk(message.id, { include: messageIncludes, transaction });
    });
  },
  async markRead(conversationId, userId, sequence) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      await ChatParticipant.update({
        last_read_sequence: Sequelize.literal(`GREATEST(last_read_sequence, ${String(sequence)})`),
      }, { where: { conversation_id: conversationId, user_id: userId }, transaction });
      return ChatParticipant.findOne({ where: { conversation_id: conversationId, user_id: userId }, transaction });
    });
  },
  async searchMessages(conversationId, userId, query, { page = 1, limit = 30 } = {}) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
      const rows = await ChatMessage.findAll({ where: {
        conversation_id: conversationId, type: "text", recalled_at: null,
        body: { [Op.iLike]: pattern },
      }, order: [["sequence", "DESC"]], limit: limit + 1, offset: (page - 1) * limit, transaction });
      return messagePage(rows, limit, page);
    });
  },
  /** Video và tệp cũ chỉ còn trong bộ lọc lịch sử; API gửi mới chỉ nhận ảnh và ghi âm. */
  async sharedMessages(conversationId, userId, type, { page = 1, limit = 30 } = {}) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      const where = { conversation_id: conversationId, recalled_at: null };
      if (type === "link") {
        where.type = "text";
        where.body = { [Op.iRegexp]: "https?://[^[:space:]<>]+" };
      } else where.type = type;
      const rows = await ChatMessage.findAll({ where, order: [["sequence", "DESC"]],
        limit: limit + 1, offset: (page - 1) * limit, transaction });
      return messagePage(rows, limit, page);
    });
  },
  async pinnedMessages(conversationId, userId) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      const pins = await ChatMessagePin.findAll({ where: { conversation_id: conversationId },
        order: [["created_at", "DESC"]], limit: 20, raw: true, transaction });
      if (!pins.length) return [];
      const rows = await ChatMessage.findAll({ where: { id: { [Op.in]: pins.map((pin) => pin.message_id) },
        recalled_at: null }, include: messageIncludes, transaction });
      const byId = new Map(rows.map((row) => [row.id, row.toJSON()]));
      return pins.filter((pin) => byId.has(pin.message_id)).map((pin) => ({
        ...byId.get(pin.message_id), pinned_at: pin.created_at,
      }));
    });
  },
  async setMessagePin(conversationId, messageId, userId, active) {
    return sequelize.transaction(async (transaction) => {
      await assertMember(conversationId, userId, transaction);
      await assertUnblocked(userId, await peerId(conversationId, userId, transaction), transaction);
      await ChatConversation.findByPk(conversationId, { transaction, lock: transaction.LOCK.UPDATE });
      const message = await ChatMessage.findOne({ where: {
        id: messageId, conversation_id: conversationId, recalled_at: null,
      }, transaction });
      if (!message || message.type === "call") throw httpError(404, "Message not found");
      const where = { message_id: messageId, conversation_id: conversationId };
      if (active) {
        const existing = await ChatMessagePin.findByPk(messageId, { transaction });
        if (!existing) {
          const count = await ChatMessagePin.count({ where: { conversation_id: conversationId }, transaction });
          if (count >= 20) throw httpError(409, "Pin limit reached");
          await ChatMessagePin.create({ ...where, pinned_by: userId }, { transaction });
        }
      } else await ChatMessagePin.destroy({ where, transaction });
      return { conversation_id: conversationId, message_id: messageId, pinned: active };
    });
  },
  async searchUsers(userId, query) {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    return User.findAll({ where: { id: { [Op.ne]: userId }, status: "active",
      full_name: { [Op.iLike]: pattern } },
    attributes: ["id", "full_name", "avatar_url"],
    order: [["full_name", "ASC"], ["id", "ASC"]], limit: 20 });
  },
  /** Thông tin liên hệ chỉ trả cho người đã có hội thoại trực tiếp với chủ hồ sơ. */
  async publicProfile(viewerId, targetId) {
    const directKey = [viewerId, targetId].sort().join(":");
    const conversation = await ChatConversation.findOne({ where: { kind: "direct", direct_key: directKey },
      attributes: ["id"] });
    if (!conversation) throw httpError(404, "User not found");
    const profile = await User.findOne({ where: { id: targetId, status: "active" },
      attributes: ["id", "full_name", "avatar_url", "about", "location", "email", "phone"] });
    if (!profile) throw httpError(404, "User not found");
    return profile;
  },
  async blockStatus(userId, targetId) {
    const rows = await ChatUserBlock.findAll({ where: { [Op.or]: [
      { blocker_id: userId, blocked_id: targetId }, { blocker_id: targetId, blocked_id: userId },
    ] }, attributes: ["blocker_id"], raw: true });
    return { blocked_by_me: rows.some((row) => row.blocker_id === userId),
      blocked_me: rows.some((row) => row.blocker_id === targetId) };
  },
  async setUserBlock(userId, targetId, blocked) {
    if (userId === targetId) throw httpError(400, "Cannot block yourself");
    return sequelize.transaction(async (transaction) => {
      const users = await User.findAll({ where: { id: [userId, targetId], status: "active" },
        attributes: ["id"], order: [["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
      if (users.length !== 2) throw httpError(404, "User not found");
      const where = { blocker_id: userId, blocked_id: targetId };
      if (blocked) await ChatUserBlock.findOrCreate({ where, defaults: where, transaction });
      else await ChatUserBlock.destroy({ where, transaction });
      return { user_id: targetId, blocked };
    });
  },
  socketUser(userId) {
    return User.findOne({ where: { id: userId, status: "active" }, attributes: ["id"] });
  },
};
