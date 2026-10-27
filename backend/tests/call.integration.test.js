const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

test("Call PostgreSQL: chỉ một active/user, state nguyên tử và timeout server", {
  skip: process.env.CHAT_TEST_DATABASE !== "1" || process.env.NODE_ENV !== "test",
}, async () => {
  const { User, ChatConversation, ChatMessage, CallSession, sequelize, Sequelize } = require("../models");
  const chat = require("../services/chat.service");
  const calls = require("../services/call.service");
  const suffix = randomUUID().slice(0, 8);
  const users = [];
  const conversations = [];
  let apiServer;
  try {
    for (const [index, role] of ["guest", "host", "guest"].entries()) {
      users.push(await User.create({ email: `call_${index}_${suffix}@example.invalid`,
        username: `call_${index}_${suffix}`, full_name: `Call user ${index}`,
        role, status: "active", provider: "local" }));
    }
    for (const guest of [users[0], users[2]]) {
      conversations.push(await chat.createDirect(guest.id, users[1].id));
    }
    const attempts = await Promise.allSettled([
      calls.create(users[0].id, conversations[0].id, randomUUID()),
      calls.create(users[2].id, conversations[1].id, randomUUID()),
    ]);
    assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((result) => result.status === "rejected")[0].reason.status, 409);
    const first = attempts.find((result) => result.status === "fulfilled").value;
    const caller = first.caller_id;
    const outsider = caller === users[0].id ? users[2].id : users[0].id;
    const otherConversation = first.conversation_id === conversations[0].id
      ? conversations[1].id : conversations[0].id;
    const express = require("express");
    const app = express();
    app.use(express.json());
    app.use(require("cookie-parser")());
    app.use("/api/v1/chat", require("../routes/v1/chat.routes"));
    app.use(require("../middlewares/error.middleware"));
    apiServer = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => apiServer.once("listening", resolve));
    const url = `http://127.0.0.1:${apiServer.address().port}/api/v1/chat`;
    const { createAccessToken } = require("../utils/jwt");
    const headers = (user) => ({ Authorization: `Bearer ${createAccessToken({ id: user })}` });
    assert.equal((await fetch(`${url}/calls/active`)).status, 401);
    const activeResponse = await fetch(`${url}/calls/active`, { headers: headers(caller) });
    assert.equal(activeResponse.status, 200);
    assert.equal((await activeResponse.json()).data.id, first.id);
    const detailResponse = await fetch(`${url}/calls/${first.id}`, { headers: headers(users[1].id) });
    assert.equal((await detailResponse.json()).data.caller_id, caller);
    assert.equal((await fetch(`${url}/calls/${first.id}`, { headers: headers(outsider) })).status, 404);
    assert.equal((await fetch(`${url}/calls/not-a-uuid`, { headers: headers(caller) })).status, 400);
    assert.equal((await sequelize.query("SELECT COUNT(*)::integer AS count FROM call_active_users WHERE user_id = :id",
      { replacements: { id: users[1].id }, type: Sequelize.QueryTypes.SELECT }))[0].count, 1);
    await assert.rejects(calls.get(outsider, first.id), { status: 404 });
    await assert.rejects(calls.signalingPeer(caller, first.id, first.caller_instance_id, "webrtc:offer"), { status: 409 });
    await assert.rejects(calls.command(caller, first.id, "accept", randomUUID()), { status: 409 });
    const calleeInstance = randomUUID();
    const accepted = await calls.command(users[1].id, first.id, "accept", calleeInstance);
    assert.equal(accepted.status, "connecting");
    assert.ok(accepted.revision > first.revision);
    await assert.rejects(calls.signalingPeer(users[1].id, first.id, randomUUID(), "webrtc:answer"), { status: 409 });
    await assert.rejects(calls.signalingPeer(caller, first.id, first.caller_instance_id, "webrtc:answer"), { status: 409 });
    assert.deepEqual(await calls.signalingPeer(caller, first.id, first.caller_instance_id, "webrtc:offer"),
      { userId: users[1].id, instanceId: calleeInstance });
    await assert.rejects(calls.command(users[1].id, first.id, "accept", randomUUID()), { status: 409 });
    await calls.report(caller, first.id, first.caller_instance_id, "connected");
    const connected = await calls.report(users[1].id, first.id, calleeInstance, "connected");
    assert.equal(connected.status, "connected");
    const ended = await calls.command(caller, first.id, "end");
    assert.equal(ended.status, "ended");
    const completedHistory = await ChatMessage.findOne({ where: { client_key: `call:${first.id}` } });
    assert.equal(completedHistory.context.status, "ended");
    assert.ok(completedHistory.context.duration_seconds >= 0);
    await assert.rejects(calls.signalingPeer(caller, first.id, first.caller_instance_id, "webrtc:offer"), { status: 409 });
    assert.equal((await calls.command(caller, first.id, "end")).ended_at.toISOString(), ended.ended_at.toISOString());
    await assert.rejects(calls.report(caller, first.id, first.caller_instance_id, "connected"), { status: 409 });
    const second = await calls.create(outsider, otherConversation, randomUUID());
    assert.equal(second.status, "ringing");
    await CallSession.update({ ring_expires_at: new Date(Date.now() - 1000) }, { where: { id: second.id } });
    await calls.reconcileExpired();
    assert.equal((await calls.get(outsider, second.id)).status, "no_answer");
    const missedHistory = await ChatMessage.findOne({ where: { client_key: `call:${second.id}` } });
    assert.equal(missedHistory.context.status, "no_answer");
    assert.equal(missedHistory.context.duration_seconds, 0);
    await assert.rejects(calls.command(users[1].id, second.id, "accept", randomUUID()), { status: 409 });
    assert.equal(await calls.active(users[1].id), null);
  } finally {
    if (apiServer) await new Promise((resolve) => { apiServer.close(resolve); apiServer.closeAllConnections(); });
    for (const conversation of conversations.reverse()) {
      await ChatConversation.destroy({ where: { id: conversation.id } });
    }
    for (const user of users.reverse()) await user.destroy({ force: true });
    await sequelize.close();
  }
});
