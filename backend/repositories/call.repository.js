const { CallSession, ChatConversation, ChatMessage, ChatParticipant, ChatUserBlock,
  User, sequelize, Sequelize } = require("../models");
const httpError = require("../utils/httpError");
const { Op } = Sequelize;

/** Slot có khóa duy nhất theo user, nên hai giao dịch gọi chéo vai trò cũng không thể cùng active. */
async function create({ conversationId, callerId, calleeId, instanceId, ringSeconds }) {
  try {
    return await sequelize.transaction(async (transaction) => {
      const users = await User.findAll({ where: { id: [callerId, calleeId], status: "active" },
        attributes: ["id"], order: [["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
      if (users.length !== 2) throw httpError(404, "Conversation not found");
      const blocked = await ChatUserBlock.count({ where: { [Op.or]: [
        { blocker_id: callerId, blocked_id: calleeId },
        { blocker_id: calleeId, blocked_id: callerId },
      ] }, transaction });
      if (blocked) throw httpError(403, "CHAT_BLOCKED");
      const conversation = await ChatConversation.findOne({ where: { id: conversationId, kind: "direct" },
        attributes: ["id"], transaction });
      if (!conversation) throw httpError(404, "Conversation not found");
      const lockedMembers = await ChatParticipant.findAll({ where: { conversation_id: conversationId,
        user_id: [callerId, calleeId] }, attributes: ["user_id"], transaction,
      lock: transaction.LOCK.SHARE });
      if (lockedMembers.length !== 2) throw httpError(404, "Conversation not found");
      const now = new Date();
      const call = await CallSession.create({ conversation_id: conversationId, caller_id: callerId,
        callee_id: calleeId, caller_instance_id: instanceId, status: "ringing", media_type: "video",
        ring_expires_at: new Date(now.getTime() + ringSeconds * 1000), last_state_changed_at: now }, { transaction });
      const slots = await sequelize.query(`INSERT INTO call_active_users (user_id, call_id)
        VALUES (:callerId, :callId), (:calleeId, :callId)
        ON CONFLICT (user_id) DO NOTHING RETURNING user_id`, {
        replacements: { callerId, calleeId, callId: call.id },
        type: Sequelize.QueryTypes.SELECT, transaction,
      });
      if (slots.length !== 2) throw httpError(409, "Call already active");
      return call.toJSON();
    });
  } catch (error) {
    if (error instanceof Sequelize.UniqueConstraintError) throw httpError(409, "Call already active");
    throw error;
  }
}

function memberWhere(userId) {
  return { [Op.or]: [{ caller_id: userId }, { callee_id: userId }] };
}

async function get(callId, userId) {
  const call = await CallSession.findOne({ where: { id: callId, ...memberWhere(userId) } });
  if (!call) throw httpError(404, "Call not found");
  return call.toJSON();
}

async function active(userId) {
  const call = await CallSession.findOne({ where: { ...memberWhere(userId), ended_at: null },
    order: [["created_at", "DESC"]] });
  return call?.toJSON() || null;
}

/** Khóa row trước khi kiểm state; thay đổi và nhả slot cùng commit. */
async function change(callId, userId, mutate) {
  return sequelize.transaction(async (transaction) => {
    const call = await CallSession.findByPk(callId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!call || (userId && userId !== call.caller_id && userId !== call.callee_id)) {
      throw httpError(404, "Call not found");
    }
    const patch = mutate(call.toJSON());
    if (!patch) return { call: call.toJSON(), changed: false, stateChanged: false };
    const stateChanged = Boolean(patch.status && patch.status !== call.status);
    await call.update({ ...patch, revision: call.revision + 1 }, { transaction });
    if (patch.ended_at) await sequelize.query("DELETE FROM call_active_users WHERE call_id = :callId", {
      replacements: { callId }, transaction,
    });
    if (patch.ended_at) {
      // Ghi mọi kết quả cuộc gọi cùng giao dịch kết thúc để retry hoặc timeout không tạo hai mục chat.
      const durationSeconds = call.connected_at
        ? Math.max(0, Math.floor((new Date(call.ended_at) - new Date(call.connected_at)) / 1000)) : 0;
      await ChatMessage.create({ conversation_id: call.conversation_id, sender_id: call.caller_id,
        type: "call", client_key: `call:${call.id}`, created_at: call.ended_at,
        context: { call_id: call.id, status: call.status, duration_seconds: durationSeconds },
      }, { transaction });
      await ChatConversation.update({ last_activity_at: call.ended_at }, {
        where: { id: call.conversation_id, last_activity_at: { [Op.lt]: call.ended_at } }, transaction,
      });
    }
    return { call: call.toJSON(), changed: true, stateChanged };
  });
}

async function expiredCandidates(now, heartbeatCutoff, limit = 100) {
  const rows = await CallSession.findAll({ where: { ended_at: null, [Op.or]: [
    { status: "ringing", ring_expires_at: { [Op.lte]: now } },
    { status: "connecting", accepted_at: { [Op.lte]: new Date(now.getTime() - 40_000) } },
    { status: "reconnecting", grace_expires_at: { [Op.lte]: now } },
    { status: "connected", [Op.or]: [
      { caller_heartbeat_at: { [Op.lt]: heartbeatCutoff } },
      { callee_heartbeat_at: { [Op.lt]: heartbeatCutoff } },
    ] },
  ] }, attributes: ["id"], limit, order: [["created_at", "ASC"]] });
  return rows.map((row) => row.id);
}

module.exports = { create, get, active, change, expiredCandidates };
