const test = require("node:test");
const assert = require("node:assert/strict");
const { loadBackend } = require("./helpers");

const guest = "10000000-0000-4000-8000-000000000001";
const host = "10000000-0000-4000-8000-000000000002";
const outsider = "10000000-0000-4000-8000-000000000003";
const listingId = "10000000-0000-4000-8000-000000000004";

function setup() {
  const conversations = new Map();
  const messages = new Map();
  const events = [];
  const onlineIds = new Set();
  const repo = {
    async findOrCreateDirect(a, b) {
      const key = [a, b].sort().join(":");
      if (conversations.has(key)) return { conversation: conversations.get(key), created: false };
      const conversation = { id: "conversation-1" };
      conversations.set(key, conversation);
      return { conversation, created: true };
    },
    async member(id, userId) { return id === "conversation-1" && [guest, host].includes(userId) ? { user_id: userId } : null; },
    async participants() { return [{ user_id: guest }, { user_id: host }]; },
    async summary() { return { id: "conversation-1", other_id: host }; },
    async messages() { return { items: [...messages.values()] }; },
    async createMessage({ conversationId, senderId, type, body, context, clientKey }) {
      const key = `${senderId}:${clientKey}`;
      if (messages.has(key)) return { message: messages.get(key), created: false };
      const message = { id: `message-${messages.size + 1}`, conversation_id: conversationId,
        sender_id: senderId, type, body, context, client_key: clientKey, sequence: messages.size + 1,
        toJSON() { return { ...this }; } };
      messages.set(key, message);
      return { message, created: true };
    },
    async messageById(id, messageId) { return [...messages.values()].find((message) => message.conversation_id === id && message.id === messageId); },
    async markRead(id, userId, sequence) { return { last_read_sequence: sequence }; },
    async list() { return { items: [{ id: "conversation-1", other_id: host }], hasMore: false, page: 1 }; },
    async unreadTotal() { return 0; },
  };
  const service = loadBackend("services/chat.service.js", {}, {
    "repositories/chat.repository.js": repo,
    "services/chat.socket.js": { emitToUsers: (users, event, data) => {
      events.push({ users, event, data, persisted: messages.has(`${data.sender_id}:${data.client_key}`) });
    }, onlineUsers: async (userIds) => new Set(userIds.filter((id) => onlineIds.has(id))) },
  });
  return { service, events, messages, onlineIds };
}

test("Inbox và hội thoại phản ánh socket online của người đối thoại", async () => {
  const { service, onlineIds } = setup();
  assert.equal((await service.detail(guest, "conversation-1")).other_online, false);
  onlineIds.add(host);
  assert.equal((await service.detail(guest, "conversation-1")).other_online, true);
  assert.equal((await service.list(guest, {})).items[0].other_online, true);
  onlineIds.delete(host);
  assert.equal((await service.list(guest, {})).items[0].other_online, false);
});

test("Hội thoại direct tái sử dụng cùng cặp user và từ chối tự nhắn", async () => {
  const { service, events } = setup();
  const [first, second] = await Promise.all([service.createDirect(guest, host), service.createDirect(guest, host)]);
  assert.equal(first.id, second.id);
  assert.equal(events.filter((event) => event.event === "chat:conversation").length, 1);
  await assert.rejects(service.createDirect(guest, guest), { status: 400 });
});

test("Người ngoài không đọc, gửi hoặc cập nhật trạng thái đọc", async () => {
  const { service } = setup();
  await assert.rejects(service.detail(outsider, "conversation-1"), { status: 404 });
  await assert.rejects(service.messages(outsider, "conversation-1", {}), { status: 404 });
  await assert.rejects(service.sendText(outsider, "conversation-1", { body: "x", client_key: "retry" }), { status: 404 });
  await assert.rejects(service.markRead(outsider, "conversation-1", "message-1"), { status: 404 });
});

test("Tin được lưu trước sự kiện và retry không tạo bản sao", async () => {
  const { service, events, messages } = setup();
  const input = { body: "Xin chào", client_key: "retry-key" };
  const first = await service.sendText(guest, "conversation-1", input);
  const retry = await service.sendText(guest, "conversation-1", input);
  assert.equal(first.id, retry.id);
  assert.equal(messages.size, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].persisted, true);
  await assert.rejects(service.sendText(guest, "conversation-1", { body: "Nội dung khác", client_key: "retry-key" }), { status: 409 });
  assert.equal((await service.markRead(host, "conversation-1", first.id)).sequence, 1);
});

test("Schema chỉ nhận text, giới hạn độ dài và không nhận sender từ client", () => {
  const schema = require("../requests/api/v1/chat.schema").sendMessage;
  const key = "10000000-0000-4000-8000-000000000005";
  assert.ok(schema.validate({ body: " ", client_key: key }).error);
  assert.ok(schema.validate({ body: "a".repeat(4001), client_key: key }).error);
  const parsed = schema.validate({ body: "Chào", client_key: key, sender_id: outsider }, { stripUnknown: true });
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value.sender_id, undefined);
});

test("Adapter xác minh listing trước khi mở chat trực tiếp với host", async () => {
  const calls = [];
  const shares = [];
  let listing = null;
  const adapter = loadBackend("integrations/booking/chat.adapter.js", {
    Listing: { findOne: async () => listing },
    ListingImage: { findOne: async () => ({ url: "https://example.com/image.jpg" }) }, User: {},
  }, { "services/chat.service.js": {
    async createDirect(userId, hostId) { calls.push([userId, hostId]); return { id: "conversation-1" }; },
    async shareListing(userId, conversationId, context, clientKey) {
      shares.push([userId, conversationId, context, clientKey]);
    },
    async detail() { return { id: "conversation-1" }; },
  } });
  await assert.rejects(adapter.contactHost(guest, listingId), { status: 404 });
  listing = { id: listingId, host_id: guest, title: "Own", images: [], city: "", country: "" };
  await assert.rejects(adapter.contactHost(guest, listingId), { status: 400 });
  listing = { ...listing, host_id: host, title: "Room", city: "Hà Nội", images: [{ url: "https://example.com/image.jpg" }] };
  const contactKey = randomUUID();
  const result = await adapter.contactHost(guest, listingId, contactKey);
  assert.equal(result.id, "conversation-1");
  assert.deepEqual(calls[0], [guest, host]);
  assert.equal(calls.length, 1);
  assert.equal(shares.length, 1);
  assert.deepEqual(shares[0].slice(0, 2), [guest, "conversation-1"]);
  assert.equal(shares[0][3], contactKey);
  assert.deepEqual({ ...shares[0][2] }, {
    type: "listing", id: listingId, title: "Room", location: "Hà Nội",
    image_url: "https://example.com/image.jpg",
  });
});

test("Vé socket chỉ dùng ngắn hạn và không thể đổi mục đích", () => {
  const tickets = loadBackend("services/chat.socket-ticket.js");
  const accessExpiresAt = Math.floor(Date.now() / 1000) + 120;
  const ticket = tickets.issue({ userId: guest, sessionId: "session", accessExpiresAt });
  assert.deepEqual({ ...tickets.verify(ticket) }, { userId: guest, sid: "session", exp: accessExpiresAt });
  const jwt = require("jsonwebtoken");
  const claims = jwt.decode(ticket);
  assert.equal(claims.exp - claims.iat, 45);
  assert.throws(() => tickets.verify("invalid"));
  const wrongPurpose = jwt.sign({ purpose: "other", user_id: guest, access_expires_at: accessExpiresAt },
    "test-secret-only", { audience: "chat_socket", expiresIn: "45s" });
  assert.throws(() => tickets.verify(wrongPurpose));
});

test("Socket chấp nhận vé hoặc cookie phiên sống và không có lệnh tự vào room", async () => {
  let middleware;
  const handlers = new Map();
  const namespace = { use(fn) { middleware = fn; }, on(name, fn) { handlers.set(name, fn); } };
  const io = { of: () => namespace };
  const socketModule = loadBackend("services/chat.socket.js", {}, {
    "utils/jwt.js": { decodeToken: () => ({ userId: guest, sid: "session", exp: Math.floor(Date.now() / 1000) + 60 }) },
    "utils/cookies.js": { accessCookieName: () => "access_token" },
    "repositories/refresh-token.repository.js": class { async findActiveSession(_userId, sid) { return sid === "session" ? { id: "session" } : null; } },
    "repositories/chat.repository.js": { socketUser: async (id) => id === guest ? { id } : null },
  });
  socketModule.attach(io);
  const authorize = (cookie, ticket) => new Promise((resolve) => middleware({
    handshake: { headers: { cookie }, auth: { ticket } }, data: {},
  }, resolve));
  const ticket = loadBackend("services/chat.socket-ticket.js").issue({
    userId: guest, sessionId: "session", accessExpiresAt: Math.floor(Date.now() / 1000) + 60,
  });
  assert.ok(await authorize(""));
  assert.equal(await authorize("access_token=valid"), undefined);
  assert.equal(await authorize("", ticket), undefined);
  assert.ok(await authorize("access_token=valid", "invalid"));
  const revoked = loadBackend("services/chat.socket-ticket.js").issue({
    userId: guest, sessionId: "revoked", accessExpiresAt: Math.floor(Date.now() / 1000) + 60,
  });
  assert.ok(await authorize("", revoked));
  assert.equal(handlers.has("connection"), true);
  assert.equal(handlers.has("chat:join"), false);
});

test("Presence chỉ báo cho người có hội thoại chung và chờ tab cuối ngắt mới offline", async () => {
  const rooms = new Map();
  const events = [];
  const handlers = new Map();
  const namespace = {
    use() {}, on(name, handler) { handlers.set(name, handler); },
    in(room) { return { fetchSockets: async () => [...(rooms.get(room) || [])] }; },
    to(room) { return { emit(event, data) { events.push({ room, event, data }); } }; },
  };
  const socketModule = loadBackend("services/chat.socket.js", {}, {
    "repositories/chat.repository.js": {
      peerIds: async (userId) => userId === guest ? [host] : [],
    },
    "repositories/refresh-token.repository.js": class {},
  });
  socketModule.attach({ of: () => namespace });
  const connect = handlers.get("connection");
  const makeSocket = () => {
    const callbacks = new Map();
    return {
      data: { userId: guest, expiresAt: Date.now() + 1_000 },
      join(room) { if (!rooms.has(room)) rooms.set(room, new Set()); rooms.get(room).add(this); },
      on(event, callback) { callbacks.set(event, callback); },
      disconnect() { rooms.get(`user:${guest}`).delete(this); callbacks.get("disconnect")(); },
    };
  };
  const first = makeSocket();
  const second = makeSocket();
  connect(first);
  await new Promise(setImmediate);
  assert.equal(events.at(-1)?.room, `user:${host}`);
  assert.equal(events.at(-1)?.event, "chat:presence");
  assert.equal(events.at(-1)?.data.user_id, guest);
  assert.equal(events.at(-1)?.data.online, true);
  connect(second);
  await new Promise(setImmediate);
  assert.equal((await socketModule.onlineUsers([guest])).has(guest), true);
  first.disconnect();
  await new Promise(setImmediate);
  assert.equal(events.filter((entry) => entry.data.online === false).length, 0);
  second.disconnect();
  await new Promise(setImmediate);
  assert.equal(events.at(-1)?.room, `user:${host}`);
  assert.equal(events.at(-1)?.data.user_id, guest);
  assert.equal(events.at(-1)?.data.online, false);
  assert.equal(events.some((entry) => entry.room === `user:${outsider}`), false);
});
