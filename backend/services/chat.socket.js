const { decodeToken } = require("../utils/jwt");
const { accessCookieName } = require("../utils/cookies");
const socketTicket = require("./chat.socket-ticket");
const RefreshTokenRepository = require("../repositories/refresh-token.repository");
const chat = require("../repositories/chat.repository");
const schema = require("../requests/api/v1/chat.schema");

let namespace;

/** Số socket được đọc từ adapter để nhiều tab và nhiều tiến trình cùng cho một trạng thái. */
async function onlineUsers(userIds) {
  if (!namespace || !userIds.length) return new Set();
  const uniqueIds = [...new Set(userIds)];
  const results = await Promise.allSettled(uniqueIds.map((userId) =>
    Promise.resolve().then(() => namespace.in(`user:${userId}`).fetchSockets())));
  return new Set(uniqueIds.filter((userId, index) =>
    results[index].status === "fulfilled" && results[index].value.length > 0));
}

/** Chỉ người đã có hội thoại chung mới nhận thay đổi presence. */
async function notifyPresence(userId, online) {
  try {
    emitToUsers(await chat.peerIds(userId), "chat:presence", { user_id: userId, online });
  } catch (error) {
    console.warn("[chat] Presence unavailable:", error.name);
  }
}

function cookieValue(header, name) {
  const part = String(header || "").split(";").map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

/** Mỗi signaling command xác minh lại phiên, call và đích nhận; payload không được ghi log. */
async function relaySignal(socket, event, payload, ack) {
  const reply = typeof ack === "function" ? ack : () => {};
  const now = Date.now();
  const window = socket.data.signalWindow;
  socket.data.signalWindow = !window || now - window.start >= 10_000
    ? { start: now, count: 1 } : { start: window.start, count: window.count + 1 };
  if (socket.data.signalWindow.count > 60) return reply({ ok: false, error: "RATE_LIMITED" });
  const validation = (event === "webrtc:ice-candidate" ? schema.signalCandidate : schema.signalOffer)
    .validate(payload, { stripUnknown: true });
  if (validation.error || (event !== "webrtc:ice-candidate" &&
    validation.value.description.type !== event.slice("webrtc:".length))) {
    return reply({ ok: false, error: "INVALID_PAYLOAD" });
  }
  try {
    const userId = socket.data.userId;
    if (socket.data.expiresAt <= now || !await chat.socketUser(userId) ||
      (socket.data.sessionId && !await new RefreshTokenRepository()
        .findActiveSession(userId, socket.data.sessionId))) {
      return reply({ ok: false, error: "UNAUTHORIZED" });
    }
    const peer = await require("./call.service").signalingPeer(userId, validation.value.call_id,
      validation.value.instance_id, event);
    socket.to(`user:${peer.userId}`).emit(event, {
      ...validation.value, target_instance_id: peer.instanceId,
    });
    return reply({ ok: true });
  } catch (error) {
    return reply({ ok: false, error: error.status === 404 ? "NOT_FOUND" : "INVALID_CALL_STATE" });
  }
}

/** Socket chỉ đăng ký phòng theo danh tính đã xác thực; state ghi qua HTTP, signaling chỉ relay có kiểm quyền. */
function attach(io) {
  namespace = io.of("/chat");
  namespace.use(async (socket, next) => {
    try {
      const ticket = socket.handshake.auth?.ticket;
      const token = ticket ? null : cookieValue(socket.handshake.headers.cookie, accessCookieName());
      if (!ticket && !token) return next(new Error("Unauthorized"));
      const { userId, sid, exp } = ticket
        ? socketTicket.verify(ticket) : decodeToken(token, "access");
      if (!await chat.socketUser(userId)) return next(new Error("Unauthorized"));
      if (sid && !await new RefreshTokenRepository().findActiveSession(userId, sid)) {
        return next(new Error("Unauthorized"));
      }
      socket.data.userId = userId;
      socket.data.sessionId = sid || null;
      socket.data.expiresAt = exp * 1000;
      return next();
    } catch { return next(new Error("Unauthorized")); }
  });
  namespace.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    for (const event of ["webrtc:offer", "webrtc:answer", "webrtc:ice-candidate"]) {
      socket.on(event, (payload, ack) => { void relaySignal(socket, event, payload, ack); });
    }
    void notifyPresence(socket.data.userId, true);
    const timeout = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
    socket.on("disconnect", () => {
      clearTimeout(timeout);
      void onlineUsers([socket.data.userId]).then((active) => {
        if (!active.has(socket.data.userId)) return notifyPresence(socket.data.userId, false);
      });
    });
  });
}

function emitToUsers(userIds, event, data) {
  if (!namespace) return;
  for (const userId of new Set(userIds)) namespace.to(`user:${userId}`).emit(event, data);
}

module.exports = { attach, emitToUsers, onlineUsers };
