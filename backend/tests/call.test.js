const test = require("node:test");
const assert = require("node:assert/strict");
const { loadBackend } = require("./helpers");

const caller = "10000000-0000-4000-8000-000000000001";
const callee = "10000000-0000-4000-8000-000000000002";
const callId = "10000000-0000-4000-8000-000000000003";
const callerInstance = "10000000-0000-4000-8000-000000000005";

test("Signaling chỉ chuyển payload hợp lệ tới room peer đã xác minh", async (t) => {
  let connect;
  const emitted = [];
  const handlers = new Map();
  const namespace = {
    use() {},
    on(event, handler) { if (event === "connection") connect = handler; },
    in() { return { fetchSockets: async () => [] }; },
    to() { return { emit() {} }; },
  };
  const signaling = loadBackend("services/chat.socket.js", {}, {
    "repositories/chat.repository.js": { peerIds: async () => [], socketUser: async () => ({ id: caller }) },
    "repositories/refresh-token.repository.js": class {},
    "services/call.service.js": { signalingPeer: async (userId, id, instanceId, event) => {
      if (userId !== caller || id !== callId) throw Object.assign(new Error("Not found"), { status: 404 });
      if (instanceId !== callerInstance || event !== "webrtc:offer") {
        throw Object.assign(new Error("Invalid call state"), { status: 409 });
      }
      return { userId: callee, instanceId: "10000000-0000-4000-8000-000000000004" };
    } },
  });
  signaling.attach({ of: () => namespace });
  const socket = {
    data: { userId: caller, expiresAt: Date.now() + 60_000, sessionId: null },
    join() {},
    on(event, handler) { handlers.set(event, handler); },
    to(room) { return { emit(event, payload) { emitted.push({ room, event, payload }); } }; },
  };
  connect(socket);
  t.after(() => handlers.get("disconnect")?.());
  const emit = (event, payload) => new Promise((resolve) => handlers.get(event)(payload, resolve));
  const offer = { call_id: callId, instance_id: callerInstance,
    description: { type: "offer", sdp: "v=0" } };
  assert.equal((await emit("webrtc:offer", offer)).ok, true);
  assert.equal(emitted[0].room, `user:${callee}`);
  assert.equal(emitted[0].payload.target_instance_id, "10000000-0000-4000-8000-000000000004");
  assert.equal((await emit("webrtc:answer", offer)).error, "INVALID_PAYLOAD");
  assert.equal((await emit("webrtc:offer", { ...offer, call_id: caller })).error, "NOT_FOUND");
  assert.equal((await emit("webrtc:offer", { ...offer, instance_id: callee })).error, "INVALID_CALL_STATE");
  assert.equal(emitted.length, 1);
});
