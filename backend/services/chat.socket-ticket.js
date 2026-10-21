/** Cấp vé ngắn hạn cho WebSocket khi cookie phiên được lưu trên domain frontend qua API rewrite. */
const jwt = require("jsonwebtoken");

const secret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

function issue({ userId, sessionId, accessExpiresAt }) {
  return jwt.sign({ purpose: "chat_socket", user_id: userId,
    session_id: sessionId || null, access_expires_at: accessExpiresAt }, secret(),
  { audience: "chat_socket", expiresIn: "45s" });
}

/** Vé chỉ dùng cho handshake; kết nối vẫn hết hạn theo access token và phiên trong database. */
function verify(ticket) {
  const claims = jwt.verify(ticket, secret(), { audience: "chat_socket" });
  if (claims.purpose !== "chat_socket" || typeof claims.user_id !== "string" ||
    !Number.isSafeInteger(claims.access_expires_at) ||
    claims.access_expires_at <= Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid chat socket ticket");
  }
  return { userId: claims.user_id, sid: claims.session_id, exp: claims.access_expires_at };
}

module.exports = { issue, verify };
