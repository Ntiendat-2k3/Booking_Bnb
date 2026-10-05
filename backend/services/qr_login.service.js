/** Ghép đôi QR ngắn hạn; chỉ desktop giữ cookie ràng buộc mới được cấp phiên đăng nhập. */
const crypto = require("node:crypto");
const { getRedis, redisReady } = require("../utils/redis");
const httpError = require("../utils/httpError");
const { safeDevice } = require("../utils/device");

const TTL_SECONDS = 120;
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sessionKey = (id) => `auth:qr:session:${id}`;
const codeKey = (code) => `auth:qr:code:${hash(code)}`;
const validId = (id) => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id);
const validCode = (code) => typeof code === "string" && /^[A-Za-z0-9_-]{43}$/.test(code);

function redis() {
  if (!redisReady()) throw httpError(503, "QR login is temporarily unavailable");
  return getRedis();
}

function desktopCookieName(id) {
  if (!validId(id)) throw httpError(400, "QR session invalid");
  return `qr_login_${id}`;
}

function browserSession(id, cookie) {
  if (!validId(id) || typeof cookie !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(cookie)) {
    throw httpError(401, "QR session invalid");
  }
  return { id, bindingHash: hash(cookie) };
}

function mobileSession(cookie) {
  if (typeof cookie !== "string") throw httpError(401, "QR scan session invalid");
  const [id, secret, extra] = cookie.split(".");
  if (extra || !validId(id) || !validCode(secret)) throw httpError(401, "QR scan session invalid");
  return { id, scanHash: hash(secret) };
}

async function pairingId(code) {
  if (!validCode(code)) throw httpError(404, "QR code invalid or expired");
  const id = await redis().get(codeKey(code));
  if (!validId(id)) throw httpError(404, "QR code invalid or expired");
  return id;
}

async function start(userAgent) {
  const url = new URL("/auth/qr/approve", process.env.FRONTEND_URL || "http://localhost:3001");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw httpError(503, "QR login requires HTTPS");
  }
  const id = crypto.randomUUID();
  const code = crypto.randomBytes(32).toString("base64url");
  const binding = crypto.randomBytes(32).toString("base64url");
  const socketTicket = crypto.randomBytes(32).toString("base64url");
  const displayCode = String(crypto.randomInt(100000, 1000000));
  const expiresAt = Date.now() + TTL_SECONDS * 1000;
  const session = { state: "created", codeHash: hash(code), bindingHash: hash(binding),
    socketHash: hash(socketTicket), displayCode, device: safeDevice(userAgent), expiresAt };
  const client = redis();
  await client.set(sessionKey(id), JSON.stringify(session), { EX: TTL_SECONDS });
  await client.set(codeKey(code), id, { EX: TTL_SECONDS });
  url.searchParams.set("code", code);
  return { id, binding, socketTicket, displayCode, expiresAt, url: url.toString() };
}

/** Lần mở đầu tiên giữ quyền xác nhận cho một trình duyệt mobile; xem lại trên cùng máy là an toàn. */
async function inspect(code, scanCookie) {
  const id = await pairingId(code);
  const existing = scanCookie ? mobileSession(scanCookie) : null;
  const scanSecret = existing?.id === id ? scanCookie.split(".")[1] : crypto.randomBytes(32).toString("base64url");
  const scanHash = hash(scanSecret);
  const raw = await redis().eval(`
    local raw = redis.call('GET', KEYS[1]); if not raw then return nil end
    local session = cjson.decode(raw)
    if session.codeHash ~= ARGV[1] then return nil end
    if session.state == 'created' then
      session.state = 'scanned'; session.scanHash = ARGV[2]
      redis.call('SET', KEYS[1], cjson.encode(session), 'KEEPTTL')
      return cjson.encode({ session = session, changed = true })
    end
    if session.state ~= 'scanned' or session.scanHash ~= ARGV[2] then return nil end
    return cjson.encode({ session = session, changed = false })
  `, { keys: [sessionKey(id)], arguments: [hash(code), scanHash] });
  if (!raw) throw httpError(409, "QR code is no longer available");
  const { session, changed } = JSON.parse(raw);
  return { id, scanCookie: `${id}.${scanSecret}`, changed, displayCode: session.displayCode,
    device: session.device, expiresAt: session.expiresAt };
}

/** Chỉ mobile đã quét, đang đăng nhập và chủ động xác nhận mới được gắn user vào QR. */
async function approve(code, userId, scanCookie) {
  const id = await pairingId(code);
  const scan = mobileSession(scanCookie);
  if (scan.id !== id) throw httpError(401, "QR scan session invalid");
  const changed = await redis().eval(`
    local raw = redis.call('GET', KEYS[1]); if not raw then return 0 end
    local session = cjson.decode(raw)
    if session.state ~= 'scanned' or session.codeHash ~= ARGV[1] or session.scanHash ~= ARGV[2] then return 0 end
    session.state = 'confirmed'; session.userId = ARGV[3]
    redis.call('SET', KEYS[1], cjson.encode(session), 'KEEPTTL')
    return 1
  `, { keys: [sessionKey(id)], arguments: [hash(code), scan.scanHash, String(userId)] });
  if (changed !== 1) throw httpError(409, "QR code is no longer available");
  return id;
}

async function desktopStatus(id, cookie) {
  const { bindingHash } = browserSession(id, cookie);
  const raw = await redis().get(sessionKey(id));
  if (!raw) return { state: "expired" };
  const session = JSON.parse(raw);
  if (session.bindingHash !== bindingHash) throw httpError(401, "QR session invalid");
  return { state: session.state, expiresAt: session.expiresAt };
}

/** Tiêu thụ QR trước khi cấp token để yêu cầu đồng thời không thể tạo hai phiên desktop. */
async function complete(id, cookie) {
  const { bindingHash } = browserSession(id, cookie);
  const userId = await redis().eval(`
    local raw = redis.call('GET', KEYS[1]); if not raw then return nil end
    local session = cjson.decode(raw)
    if session.state ~= 'confirmed' or session.bindingHash ~= ARGV[1] then return nil end
    session.state = 'consumed'
    redis.call('SET', KEYS[1], cjson.encode(session), 'KEEPTTL')
    return session.userId
  `, { keys: [sessionKey(id)], arguments: [bindingHash] });
  if (!userId) throw httpError(409, "QR session invalid or expired");
  return { id, userId };
}

async function cancel(id, cookie) {
  const { bindingHash } = browserSession(id, cookie);
  const changed = await redis().eval(`
    local raw = redis.call('GET', KEYS[1]); if not raw then return 0 end
    local session = cjson.decode(raw)
    if session.bindingHash ~= ARGV[1] or session.state == 'consumed' or session.state == 'cancelled' then return 0 end
    session.state = 'cancelled'; redis.call('SET', KEYS[1], cjson.encode(session), 'KEEPTTL')
    return 1
  `, { keys: [sessionKey(id)], arguments: [bindingHash] });
  if (changed !== 1) throw httpError(409, "QR session invalid or expired");
  return id;
}

async function cancelMobile(code, scanCookie) {
  const id = await pairingId(code);
  const scan = mobileSession(scanCookie);
  if (scan.id !== id) throw httpError(401, "QR scan session invalid");
  const changed = await redis().eval(`
    local raw = redis.call('GET', KEYS[1]); if not raw then return 0 end
    local session = cjson.decode(raw)
    if session.state ~= 'scanned' or session.codeHash ~= ARGV[1] or session.scanHash ~= ARGV[2] then return 0 end
    session.state = 'cancelled'; redis.call('SET', KEYS[1], cjson.encode(session), 'KEEPTTL')
    return 1
  `, { keys: [sessionKey(id)], arguments: [hash(code), scan.scanHash] });
  if (changed !== 1) throw httpError(409, "QR code is no longer available");
  return id;
}

async function authorizeSocket(id, ticket) {
  if (!validId(id) || !validCode(ticket)) return false;
  const raw = await redis().get(sessionKey(id));
  if (!raw) return false;
  const session = JSON.parse(raw);
  return session.socketHash === hash(ticket) && ["created", "scanned", "confirmed"].includes(session.state);
}

module.exports = { start, inspect, approve, desktopStatus, complete, cancel, cancelMobile,
  authorizeSocket, desktopCookieName, TTL_SECONDS };
