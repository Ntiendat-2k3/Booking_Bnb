const calls = require("../repositories/call.repository");
const chat = require("./chat.service");
const socket = require("./chat.socket");
const httpError = require("../utils/httpError");
const { ChatMessage, Notification } = require("../models");
const preferences = require("./notification-preference.service");

const positiveSeconds = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const RING_SECONDS = positiveSeconds(process.env.CALL_RING_SECONDS, 40);
const GRACE_SECONDS = positiveSeconds(process.env.CALL_GRACE_SECONDS, 15);
const HEARTBEAT_SECONDS = 25;
const terminal = new Set(["declined", "cancelled", "no_answer", "ended", "failed"]);

function canonical(call, peer) {
  return { id: call.id, conversation_id: call.conversation_id,
    caller_id: call.caller_id, callee_id: call.callee_id,
    caller_instance_id: call.caller_instance_id, callee_instance_id: call.callee_instance_id,
    status: call.status, revision: call.revision, media_type: call.media_type,
    ring_expires_at: call.ring_expires_at,
    grace_expires_at: call.grace_expires_at, accepted_at: call.accepted_at,
    connected_at: call.connected_at, ended_at: call.ended_at, end_reason: call.end_reason,
    last_state_changed_at: call.last_state_changed_at, created_at: call.created_at,
    peer_name: peer.other_name, peer_avatar: peer.other_avatar };
}

async function forUser(call, userId) {
  const peer = await chat.detail(userId, call.conversation_id);
  return canonical(call, peer);
}

/** Sau commit, mỗi participant nhận snapshot chỉ chứa peer của chính mình. */
async function publish(call) {
  if (call.status === "no_answer") {
    try {
      if (await preferences.allows(call.callee_id, "calls")) await Notification.findOrCreate({
        where: { user_id: call.callee_id, dedupe_key: `call:${call.id}:missed` },
        defaults: { type: "missed_call", title: "Cuộc gọi nhỡ",
          message: "Bạn có một cuộc gọi video chưa trả lời.",
          resource_type: "conversation", resource_id: call.conversation_id },
      });
    } catch (error) { console.error("[call] Không thể tạo thông báo cuộc gọi nhỡ:", error.name); }
  }
  await Promise.allSettled([call.caller_id, call.callee_id].map(async (userId) => {
    socket.emitToUsers([userId], "call:state", await forUser(call, userId));
  }));
  if (call.ended_at && call.connected_at) {
    try {
      const message = await ChatMessage.findOne({ where: {
        sender_id: call.caller_id, client_key: `call:${call.id}`,
      } });
      if (message) socket.emitToUsers([call.caller_id, call.callee_id], "chat:message", message.toJSON());
    } catch (error) { console.error("[call] Không thể phát lịch sử cuộc gọi:", error.name); }
  }
}

function finish(status, reason, now) {
  return { status, end_reason: reason, ended_at: now, last_state_changed_at: now,
    grace_expires_at: null };
}

async function create(userId, conversationId, instanceId) {
  const membership = await chat.requireMember(userId, conversationId);
  const peerId = await chat.callPeer(userId, conversationId);
  if (!peerId || peerId === userId || !membership) throw httpError(404, "Conversation not found");
  const call = await calls.create({ conversationId, callerId: userId, calleeId: peerId,
    instanceId, ringSeconds: RING_SECONDS });
  await publish(call);
  return forUser(call, userId);
}

async function get(userId, callId) {
  const existing = await calls.get(callId, userId);
  await chat.requireMember(userId, existing.conversation_id);
  await expireOne(callId);
  return forUser(await calls.get(callId, userId), userId);
}

async function active(userId) {
  const current = await calls.active(userId);
  if (!current) return null;
  await chat.requireMember(userId, current.conversation_id);
  await expireOne(current.id);
  const latest = await calls.active(userId);
  return latest ? forUser(latest, userId) : null;
}

/** Mọi lệnh trạng thái được quyết định trên row đã khóa, không dựa vào snapshot client. */
async function command(userId, callId, action, instanceId) {
  const existing = await calls.get(callId, userId);
  await chat.requireMember(userId, existing.conversation_id);
  if (action === "accept") await chat.callPeer(userId, existing.conversation_id);
  await expireOne(callId);
  const { call, changed } = await calls.change(callId, userId, (current) => {
    const now = new Date();
    if (action === "end" && terminal.has(current.status)) return null;
    if (terminal.has(current.status)) throw httpError(409, "Call already ended");
    if (action === "accept") {
      if (userId !== current.callee_id || current.status !== "ringing" ||
        new Date(current.ring_expires_at) <= now) throw httpError(409, "Call cannot be accepted");
      return { status: "connecting", callee_instance_id: instanceId,
        accepted_at: now, last_state_changed_at: now };
    }
    if (action === "decline" && userId === current.callee_id && current.status === "ringing") {
      return finish("declined", "declined", now);
    }
    if (action === "cancel" && userId === current.caller_id && current.status === "ringing") {
      return finish("cancelled", "cancelled", now);
    }
    if (action === "end" && current.status !== "ringing") return finish("ended", "hangup", now);
    throw httpError(409, "Invalid call transition");
  });
  if (changed) await publish(call);
  return forUser(call, userId);
}

/** Heartbeat hai phía tách biệt để một tab còn sống không che mất peer đã rời call. */
async function report(userId, callId, instanceId, connection) {
  const existing = await calls.get(callId, userId);
  await chat.requireMember(userId, existing.conversation_id);
  await expireOne(callId);
  const { call, stateChanged } = await calls.change(callId, userId, (current) => {
    const now = new Date();
    if (terminal.has(current.status) || current.status === "ringing") {
      throw httpError(409, "Invalid call transition");
    }
    const ownedInstance = userId === current.caller_id ? current.caller_instance_id : current.callee_instance_id;
    if (ownedInstance !== instanceId) throw httpError(409, "Call belongs to another tab");
    if (connection === "failed") return finish("failed", "ice_failed", now);
    const ownField = userId === current.caller_id ? "caller_heartbeat_at" : "callee_heartbeat_at";
    const otherField = userId === current.caller_id ? "callee_heartbeat_at" : "caller_heartbeat_at";
    if (connection === "disconnected") {
      if (current.status === "reconnecting") return { [ownField]: null };
      return { [ownField]: null, status: "reconnecting",
        grace_expires_at: new Date(now.getTime() + GRACE_SECONDS * 1000), last_state_changed_at: now };
    }
    if (connection !== "connected") throw httpError(400, "Invalid connection state");
    const peerAlive = current[otherField] &&
      new Date(current[otherField]).getTime() > now.getTime() - HEARTBEAT_SECONDS * 1000;
    const nextStatus = peerAlive ? "connected" : current.status;
    return { [ownField]: now, status: nextStatus,
      ...(nextStatus === "connected" ? { connected_at: current.connected_at || now, grace_expires_at: null } : {}),
      ...(nextStatus !== current.status ? { last_state_changed_at: now } : {}),
    };
  });
  if (stateChanged) await publish(call);
  return forUser(call, userId);
}

/** Hết hạn được kiểm lại dưới row lock để không ghi đè accept/end vừa thắng race. */
async function expireOne(callId) {
  const { call, changed } = await calls.change(callId, null, (current) => {
    if (terminal.has(current.status)) return null;
    const now = new Date();
    if (current.status === "ringing" && new Date(current.ring_expires_at) <= now) {
      return finish("no_answer", "no_answer", now);
    }
    if (current.status === "connecting" && current.accepted_at &&
      new Date(current.accepted_at).getTime() + 40_000 <= now.getTime()) {
      return finish("failed", "connection_timeout", now);
    }
    if (current.status === "reconnecting" && current.grace_expires_at &&
      new Date(current.grace_expires_at) <= now) return finish("failed", "network_lost", now);
    if (current.status === "connected" && (!current.caller_heartbeat_at || !current.callee_heartbeat_at ||
      Math.min(new Date(current.caller_heartbeat_at).getTime(),
        new Date(current.callee_heartbeat_at).getTime()) + HEARTBEAT_SECONDS * 1000 <= now.getTime())) {
      return { status: "reconnecting", grace_expires_at: new Date(now.getTime() + GRACE_SECONDS * 1000),
        last_state_changed_at: now };
    }
    return null;
  });
  if (changed) await publish(call);
  return call;
}

async function reconcileExpired() {
  const now = new Date();
  const ids = await calls.expiredCandidates(now,
    new Date(now.getTime() - HEARTBEAT_SECONDS * 1000));
  const results = await Promise.allSettled(ids.map((id) => expireOne(id)));
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Call reconciliation failed");
  }
}

/** Signaling chỉ đi qua call chưa terminal và đúng hai participant đã xác thực. */
async function signalingPeer(userId, callId, instanceId, event) {
  const existing = await calls.get(callId, userId);
  await chat.requireMember(userId, existing.conversation_id);
  await chat.callPeer(userId, existing.conversation_id);
  await expireOne(callId);
  const call = await calls.get(callId, userId);
  if (!["connecting", "connected", "reconnecting"].includes(call.status)) {
    throw httpError(409, "Call is not accepting signaling");
  }
  const caller = userId === call.caller_id;
  await chat.requireMember(caller ? call.callee_id : call.caller_id, call.conversation_id);
  if ((caller ? call.caller_instance_id : call.callee_instance_id) !== instanceId ||
    (event === "webrtc:offer" && !caller) || (event === "webrtc:answer" && caller)) {
    throw httpError(409, "Call signaling belongs to another tab or role");
  }
  return caller
    ? { userId: call.callee_id, instanceId: call.callee_instance_id }
    : { userId: call.caller_id, instanceId: call.caller_instance_id };
}

/** Chặn người dùng kết thúc cuộc gọi đang diễn ra giữa đúng hai tài khoản đó. */
async function endBlockedPair(firstId, secondId) {
  const current = await calls.active(firstId);
  if (!current || ![current.caller_id, current.callee_id].includes(secondId)) return;
  const { call, changed } = await calls.change(current.id, null, (locked) =>
    terminal.has(locked.status) ? null : finish("ended", "blocked", new Date()));
  if (changed) await publish(call);
}

module.exports = { create, get, active, command, report, reconcileExpired, signalingPeer,
  endBlockedPair };
