const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Writable } = require("node:stream");
const { loadBackend } = require("./helpers");

const sender = "10000000-0000-4000-8000-000000000001";
const recipient = "10000000-0000-4000-8000-000000000002";
const outsider = "10000000-0000-4000-8000-000000000003";
const conversationId = "10000000-0000-4000-8000-000000000004";
const key = "10000000-0000-4000-8000-000000000005";

function setup() {
  const messages = new Map();
  const uploads = [];
  const discarded = [];
  const events = [];
  let failWrite = false;
  const repository = {
    member: async (id, userId) => id === conversationId && [sender, recipient].includes(userId) ? {} : null,
    participants: async () => [{ user_id: sender }, { user_id: recipient }],
    messageByClientKey: async (userId, clientKey) => messages.get(`${userId}:${clientKey}`) || null,
    messageById: async (id, messageId) => [...messages.values()].find((message) =>
      message.conversation_id === id && message.id === messageId) || null,
    async createMessage({ conversationId: id, senderId, type, context, clientKey }) {
      if (failWrite) throw new Error("DB unavailable");
      const messageKey = `${senderId}:${clientKey}`;
      if (messages.has(messageKey)) return { message: messages.get(messageKey), created: false };
      const message = { id: "10000000-0000-4000-8000-000000000006", conversation_id: id,
        sender_id: senderId, type, context, client_key: clientKey,
        toJSON() { return { ...this }; } };
      messages.set(messageKey, message);
      return { message, created: true };
    },
  };
  const cloudinary = {
    async uploadChatFile(file, publicId) {
      uploads.push(publicId);
      return { public_id: publicId, resource_type: file.mimetype.startsWith("image/") ? "image" : "video",
        type: "authenticated", format: file.mimetype === "audio/webm" ? "webm" : "jpg",
        bytes: file.size, width: 100, height: 100 };
    },
    chatDownloadUrl: (publicId) => `https://cloud.example/private/${publicId}`,
    async destroy(publicId, resourceType, deliveryType) { discarded.push({ publicId, resourceType, deliveryType }); },
  };
  const service = loadBackend("services/chat.service.js", {}, {
    "repositories/chat.repository.js": repository,
    "services/cloudinary.service.js": cloudinary,
    "services/background_job.service.js": { enqueue: async () => {} },
    "services/chat.socket.js": { emitToUsers: (_users, event, data) => events.push({ event, data }) },
  });
  return { service, messages, uploads, discarded, events, setFailWrite: (value) => { failWrite = value; } };
}

function temporaryFile(t, content = Buffer.from([0xff, 0xd8, 0xff, 0x00]), mimetype = "image/jpeg") {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "chat-media-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, "upload");
  fs.writeFileSync(filePath, content);
  return { path: filePath, size: content.length, mimetype };
}

test("Media chỉ ghi sau upload và retry cùng tệp không upload hay phát event lần hai", async (t) => {
  const state = setup();
  const file = temporaryFile(t);
  const first = await state.service.sendMedia(sender, conversationId, { client_key: key }, file);
  const retry = await state.service.sendMedia(sender, conversationId, { client_key: key }, file);
  assert.equal(first.id, retry.id);
  assert.equal(state.messages.size, 1);
  assert.equal(state.uploads.length, 1);
  assert.equal(state.events.length, 1);
  assert.equal(first.context.public_id.startsWith(`booking_bnb/chat/${conversationId}/`), true);
  assert.equal(first.context.sha256.length, 64);
  assert.equal(JSON.stringify(first).includes("cloud.example"), false);
  assert.equal(state.discarded.length, 0);
});

test("Media từ người ngoài và retry khác tệp bị từ chối", async (t) => {
  const state = setup();
  const file = temporaryFile(t);
  await assert.rejects(state.service.sendMedia(outsider, conversationId, { client_key: key }, file), { status: 404 });
  await state.service.sendMedia(sender, conversationId, { client_key: key }, file);
  const otherFile = temporaryFile(t, Buffer.from([0xff, 0xd8, 0xff, 0x01]));
  await assert.rejects(state.service.sendMedia(sender, conversationId, { client_key: key }, otherFile), { status: 409 });
  assert.equal(state.uploads.length, 1);
});

test("Đọc media kiểm participant, hội thoại và loại message", async (t) => {
  const state = setup();
  const file = temporaryFile(t);
  const message = await state.service.sendMedia(sender, conversationId, { client_key: key }, file);
  await assert.rejects(state.service.mediaUrl(outsider, conversationId, message.id), { status: 404 });
  await assert.rejects(state.service.mediaUrl(sender, conversationId, outsider), { status: 404 });
  const media = await state.service.mediaUrl(recipient, conversationId, message.id);
  assert.match(media.url, /^https:\/\/cloud\.example\/private\//);
  assert.equal(media.mimeType, "image/jpeg");
});

test("Lỗi ghi message sau upload xóa asset authenticated", async (t) => {
  const state = setup();
  state.setFailWrite(true);
  await assert.rejects(state.service.sendMedia(sender, conversationId, { client_key: key }, temporaryFile(t)),
    /DB unavailable/);
  assert.equal(state.messages.size, 0);
  assert.equal(state.events.length, 0);
  assert.equal(state.discarded.length, 1);
  assert.equal(state.discarded[0].deliveryType, "authenticated");
});

test("Ảnh quá giới hạn bị chặn trước upload", async (t) => {
  const state = setup();
  const file = temporaryFile(t);
  file.size = 10 * 1024 * 1024;
  await assert.rejects(state.service.sendMedia(sender, conversationId, { client_key: key }, file), { status: 400 });
  assert.equal(state.uploads.length, 0);
});

test("Audio cần chữ ký container hợp lệ và được upload ở chế độ authenticated", async (t) => {
  const options = [];
  const cloudinary = loadBackend("services/cloudinary.service.js", {}, {
    "config/cloudinary.js": { initCloudinary: () => ({ uploader: {
      upload_stream(config, callback) {
        options.push(config);
        return new Writable({ write(_chunk, _encoding, done) { done(); },
          final(done) { callback(null, { public_id: config.public_id }); done(); } });
      },
    } }) },
  });
  const invalid = temporaryFile(t, Buffer.from([0xff, 0xd8, 0xff, 0x00]), "audio/webm");
  await assert.rejects(cloudinary.uploadChatFile(invalid, "chat/invalid"), { status: 400 });
  const valid = temporaryFile(t, Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]), "audio/webm");
  await cloudinary.uploadChatFile(valid, "chat/valid");
  assert.equal(options.length, 1);
  assert.equal(options[0].resource_type, "video");
  assert.equal(options[0].type, "authenticated");
});

test("URL media chat có chữ ký và giữ đúng đuôi tệp raw", () => {
  const client = require("cloudinary").v2;
  client.config({ cloud_name: "test-cloud", api_key: "test-key", api_secret: "test-secret", secure: true });
  const cloudinary = loadBackend("services/cloudinary.service.js", {}, {
    "config/cloudinary.js": { initCloudinary: () => client },
  });
  const image = new URL(cloudinary.chatDownloadUrl("booking_bnb/chat/id/picture", "jpg", "image"));
  const audio = new URL(cloudinary.chatDownloadUrl("booking_bnb/chat/id/voice", "webm", "video"));
  const raw = new URL(cloudinary.chatDownloadUrl("booking_bnb/chat/id/document.pdf", "pdf", "raw"));
  assert.match(image.pathname, /\/image\/authenticated\/s--[^/]+--\/v1\/booking_bnb\/chat\/id\/picture\.jpg$/);
  assert.match(audio.pathname, /\/video\/authenticated\/s--[^/]+--\/v1\/booking_bnb\/chat\/id\/voice\.webm$/);
  assert.match(raw.pathname, /\/raw\/authenticated\/s--[^/]+--\/v1\/booking_bnb\/chat\/id\/document\.pdf$/);
  assert.equal(image.searchParams.has("expires_at"), false);
  assert.equal(audio.searchParams.has("expires_at"), false);
  assert.equal(raw.searchParams.has("expires_at"), false);
});
