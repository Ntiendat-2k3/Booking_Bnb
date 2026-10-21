const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const http = require("node:http");

test("Chat PostgreSQL: hội thoại trực tiếp, retry, quyền và unread", {
  skip: process.env.CHAT_TEST_DATABASE !== "1" || process.env.NODE_ENV === "production",
}, async () => {
  const { User, Listing, ChatConversation, ChatMessage, sequelize } = require("../models");
  const chat = require("../services/chat.service");
  const booking = require("../integrations/booking/chat.adapter");
  const suffix = randomUUID().slice(0, 8);
  const users = [];
  let listing;
  let conversationId;
  let emptyConversationId;
  let apiServer;
  let server;
  let hostSocket;
  let guestSocket;
  let outsiderSocket;
  try {
    for (const role of ["guest", "host"]) {
      users.push(await User.create({ email: `chat_${role}_${suffix}@example.invalid`,
        username: `chat_${role}_${suffix}`, full_name: role, role, status: "active", provider: "local" }));
    }
    listing = await Listing.create({ host_id: users[1].id, title: "Test chat room", city: "Hà Nội",
      country: "Việt Nam", price_per_night: 100000, max_guests: 2, status: "published" });
    await assert.rejects(booking.contactHost(users[0].id, randomUUID()), { status: 404 });
    await assert.rejects(booking.contactHost(users[1].id, listing.id), { status: 400 });
    await listing.update({ status: "draft" });
    await assert.rejects(booking.contactHost(users[0].id, listing.id), { status: 404 });
    await listing.update({ status: "published" });
    await users[1].update({ status: "blocked" });
    await assert.rejects(booking.contactHost(users[0].id, listing.id), { status: 404 });
    await users[1].update({ status: "active" });
    assert.equal(await ChatConversation.count({ where: { direct_key: [users[0].id, users[1].id].sort().join(":") } }), 0);
    const contactKey = randomUUID();
    const results = await Promise.all([booking.contactHost(users[0].id, listing.id, contactKey),
      booking.contactHost(users[0].id, listing.id, contactKey)]);
    conversationId = results[0].id;
    assert.equal(results[1].id, conversationId);
    assert.equal(await ChatConversation.count({ where: { direct_key: [users[0].id, users[1].id].sort().join(":") } }), 1);
    assert.equal(await ChatMessage.count({ where: { conversation_id: conversationId, type: "shared_context" } }), 1);
    const secondGuest = await User.create({ email: `chat_other_${suffix}@example.invalid`,
      username: `chat_other_${suffix}`, full_name: "Second guest", role: "guest", status: "active", provider: "local" });
    users.push(secondGuest);
    emptyConversationId = (await chat.createDirect(users[0].id, secondGuest.id)).id;
    const firstPage = await chat.list(users[0].id, { page: 1, limit: 1 });
    const secondPage = await chat.list(users[0].id, { page: 2, limit: 1 });
    assert.equal(firstPage.items.length, 1);
    assert.equal(firstPage.hasMore, true);
    assert.equal(secondPage.items.length, 1);
    assert.equal(secondPage.hasMore, false);
    assert.deepEqual(new Set([firstPage.items[0].id, secondPage.items[0].id]),
      new Set([conversationId, emptyConversationId]));
    const emptySummary = await chat.detail(users[0].id, emptyConversationId);
    assert.equal(emptySummary.last_message_id, null);
    assert.equal(emptySummary.unread_count, 0);
    assert.equal((await chat.list(users[1].id, {})).items.length, 1);
    assert.equal((await chat.list(secondGuest.id, {})).items.length, 1);
    assert.equal((await chat.list(randomUUID(), {})).items.length, 0);
    await assert.rejects(chat.detail(randomUUID(), emptyConversationId), { status: 404 });

    const express = require("express");
    const apiApp = express();
    apiApp.use(express.json());
    apiApp.use(require("cookie-parser")());
    apiApp.use("/api/v1/chat", require("../routes/v1/chat.routes"));
    apiApp.use(require("../middlewares/error.middleware"));
    apiServer = apiApp.listen(0, "127.0.0.1");
    await new Promise((resolve) => apiServer.once("listening", resolve));
    const apiUrl = `http://127.0.0.1:${apiServer.address().port}/api/v1/chat`;
    const { createAccessToken } = require("../utils/jwt");
    const { accessCookieName, csrfCookieName } = require("../utils/cookies");
    const guestHeaders = { Authorization: `Bearer ${createAccessToken({ id: users[0].id })}` };
    const outsiderHeaders = { Authorization: `Bearer ${createAccessToken({ id: secondGuest.id })}` };
    const unauthorized = await fetch(apiUrl);
    assert.equal(unauthorized.status, 401);
    const listResponse = await fetch(`${apiUrl}?page=1&limit=1`, { headers: guestHeaders });
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.headers.get("cache-control"), "private, no-store");
    const listJson = await listResponse.json();
    assert.equal(listJson.status, "success");
    assert.equal(listJson.data.hasMore, true);
    assert.equal(listJson.data.items.length, 1);
    const detailResponse = await fetch(`${apiUrl}/${emptyConversationId}`, { headers: guestHeaders });
    assert.equal(detailResponse.status, 200);
    assert.equal((await detailResponse.json()).data.last_message_id, null);
    const outsiderResponse = await fetch(`${apiUrl}/${conversationId}`, { headers: outsiderHeaders });
    assert.equal(outsiderResponse.status, 404);
    assert.equal((await outsiderResponse.json()).status, "error");
    const csrf = randomUUID();
    const nextContactKey = randomUUID();
    const contactOptions = { method: "POST",
      headers: { ...guestHeaders, Cookie: `${csrfCookieName()}=${csrf}`,
        "X-CSRF-Token": csrf, "Content-Type": "application/json" },
      body: JSON.stringify({ client_key: nextContactKey }) };
    const contactResponse = await fetch(`${apiUrl}/listings/${listing.id}`, contactOptions);
    assert.equal(contactResponse.status, 200);
    assert.equal((await contactResponse.json()).data.id, conversationId);
    const contactRetry = await fetch(`${apiUrl}/listings/${listing.id}`, contactOptions);
    assert.equal(contactRetry.status, 200);
    assert.equal(await ChatMessage.count({ where: { conversation_id: conversationId, type: "shared_context" } }), 2);
    const noCsrf = await fetch(`${apiUrl}/listings/${listing.id}`, { method: "POST", headers: guestHeaders });
    assert.equal(noCsrf.status, 403);
    assert.equal((await noCsrf.json()).status, "error");

    let history = await chat.messages(users[1].id, conversationId, {});
    assert.equal(history.items.length, 2);
    assert.equal(history.items[0].context.id, listing.id);
    assert.equal(await chat.unreadTotal(users[1].id), 2);
    const key = randomUUID();
    const first = await chat.sendText(users[0].id, conversationId, { body: "Xin chào", client_key: key });
    assert.equal((await chat.list(users[0].id, { page: 1, limit: 1 })).items[0].id, conversationId);
    const retry = await chat.sendText(users[0].id, conversationId, { body: "Xin chào", client_key: key });
    assert.equal(first.id, retry.id);
    assert.equal(await chat.unreadTotal(users[1].id), 3);
    await chat.markRead(users[1].id, conversationId, first.id);
    assert.equal(await chat.unreadTotal(users[1].id), 0);
    await assert.rejects(chat.detail(randomUUID(), conversationId), { status: 404 });
    await assert.rejects(chat.sendText(randomUUID(), conversationId, { body: "x", client_key: randomUUID() }), { status: 404 });
    const reply = await chat.sendText(users[1].id, conversationId, { body: "Chào bạn", client_key: randomUUID() });
    assert.equal(await chat.unreadTotal(users[0].id), 1);
    history = await chat.messages(users[0].id, conversationId, {});
    assert.equal(history.items.at(-1).id, reply.id);
    const newest = await chat.messages(users[0].id, conversationId, { limit: 1 });
    assert.equal(newest.items[0].id, reply.id);
    assert.equal(newest.hasMore, true);
    assert.equal((await chat.messages(users[0].id, conversationId, { limit: 1, before: newest.nextCursor })).items.length, 1);
    const inbox = await chat.list(users[1].id, { search: "guest", page: 1, limit: 20 });
    assert.equal(inbox.items[0].id, conversationId);
    assert.equal(inbox.items[0].unread_count, 0);

    const messageUrl = `${apiUrl}/${conversationId}/messages`;
    const writeHeaders = { ...guestHeaders, Cookie: `${csrfCookieName()}=${csrf}`,
      "X-CSRF-Token": csrf, "Content-Type": "application/json" };
    const countBefore = await ChatMessage.count({ where: { conversation_id: conversationId } });
    for (const body of ["   ", "x".repeat(4001)]) {
      const invalid = await fetch(messageUrl, { method: "POST", headers: writeHeaders,
        body: JSON.stringify({ body, client_key: randomUUID() }) });
      assert.equal(invalid.status, 400);
    }
    assert.equal(await ChatMessage.count({ where: { conversation_id: conversationId } }), countBefore);
    const httpKey = randomUUID();
    const sendBody = JSON.stringify({ body: ` ${"x".repeat(3998)} `, client_key: httpKey });
    const sentHttp = await fetch(messageUrl, { method: "POST", headers: writeHeaders, body: sendBody });
    assert.equal(sentHttp.status, 201);
    const persisted = (await sentHttp.json()).data;
    assert.equal(persisted.body.length, 3998);
    assert.ok(persisted.id && persisted.created_at && persisted.sequence);
    const retryHttp = await fetch(messageUrl, { method: "POST", headers: writeHeaders, body: sendBody });
    assert.equal((await retryHttp.json()).data.id, persisted.id);
    assert.equal(await ChatMessage.count({ where: { sender_id: users[0].id, client_key: httpKey } }), 1);
    const outsiderHistory = await fetch(messageUrl, { headers: outsiderHeaders });
    assert.equal(outsiderHistory.status, 404);
    const outsiderWrite = await fetch(messageUrl, { method: "POST", headers: {
      ...writeHeaders, Authorization: outsiderHeaders.Authorization,
    }, body: JSON.stringify({ body: "No access", client_key: randomUUID() }) });
    assert.equal(outsiderWrite.status, 404);

    const qrSocket = require("../services/qr_login.socket");
    const chatSocket = require("../services/chat.socket");
    const chatSocketTicket = require("../services/chat.socket-ticket");
    const { io } = require("../../frontend/node_modules/socket.io-client");
    server = http.createServer();
    await qrSocket.attach(server);
    chatSocket.attach(qrSocket.getIO());
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}/chat`;
    const connect = (userId) => io(url, { autoConnect: false, transports: ["websocket"],
      extraHeaders: { Origin: "http://localhost:3001", Cookie: `${accessCookieName()}=${createAccessToken({ id: userId })}` } });
    hostSocket = io(url, { autoConnect: false, transports: ["websocket"],
      extraHeaders: { Origin: "http://localhost:3001" },
      auth: { ticket: chatSocketTicket.issue({ userId: users[1].id,
        accessExpiresAt: Math.floor(Date.now() / 1000) + 60 }) } });
    const connected = new Promise((resolve, reject) => {
      hostSocket.once("connect", resolve); hostSocket.once("connect_error", reject);
    });
    hostSocket.connect();
    await connected;
    assert.equal((await chat.detail(users[0].id, conversationId)).other_online, true);
    const onlineEvent = new Promise((resolve) => hostSocket.once("chat:presence", resolve));
    guestSocket = connect(users[0].id);
    const guestConnected = new Promise((resolve, reject) => {
      guestSocket.once("connect", resolve); guestSocket.once("connect_error", reject);
    });
    guestSocket.connect();
    await guestConnected;
    assert.deepEqual(await onlineEvent, { user_id: users[0].id, online: true });
    assert.equal((await chat.detail(users[1].id, conversationId)).other_online, true);
    const offlineEvent = new Promise((resolve) => hostSocket.once("chat:presence", resolve));
    guestSocket.disconnect();
    assert.deepEqual(await offlineEvent, { user_id: users[0].id, online: false });
    assert.equal((await chat.detail(users[1].id, conversationId)).other_online, false);
    outsiderSocket = connect(randomUUID());
    const denied = new Promise((resolve) => outsiderSocket.once("connect_error", resolve));
    outsiderSocket.connect();
    assert.match((await denied).message, /Unauthorized/);
    const event = new Promise((resolve) => hostSocket.once("chat:message", resolve));
    const realtime = await chat.sendText(users[0].id, conversationId, { body: "Realtime", client_key: randomUUID() });
    assert.equal((await event).id, realtime.id);
  } finally {
    if (apiServer) await new Promise((resolve) => { apiServer.close(resolve); apiServer.closeAllConnections(); });
    hostSocket?.disconnect();
    guestSocket?.disconnect();
    outsiderSocket?.disconnect();
    if (server) {
      await require("../services/qr_login.socket").close();
      await new Promise((resolve) => server.close(resolve));
    }
    if (conversationId) await ChatConversation.destroy({ where: { id: conversationId } });
    if (emptyConversationId) await ChatConversation.destroy({ where: { id: emptyConversationId } });
    if (listing) await listing.destroy({ force: true });
    for (const user of users.reverse()) await user.destroy({ force: true });
    await sequelize.close();
  }
});
