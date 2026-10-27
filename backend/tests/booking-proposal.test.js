const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { loadBackend, database } = require("./helpers");

const guest = "10000000-0000-4000-8000-000000000001";
const host = "10000000-0000-4000-8000-000000000002";
const outsider = "10000000-0000-4000-8000-000000000003";
const listingId = "10000000-0000-4000-8000-000000000004";
const conversationId = "10000000-0000-4000-8000-000000000005";
const secondListingId = "10000000-0000-4000-8000-000000000006";
const thirdListingId = "10000000-0000-4000-8000-000000000007";
const dates = { listing_id: listingId, check_in: "2099-01-01",
  check_out: "2099-01-03", guests_count: 2, renter_name: "Nguyễn Văn A",
  renter_phone: "0912345678", special_requests: "Tầng thấp" };

function setup() {
  const db = database({
    User: [{ id: guest, role: "guest", status: "active" },
      { id: host, role: "host", status: "active" }],
    Listing: [{ id: listingId, host_id: host, title: "Studio Ary", city: "Hà Nội",
      country: "Việt Nam", status: "published", deleted_at: null,
      max_guests: 3, price_per_night: "600000" }],
    ChatConversation: [{ id: conversationId, kind: "direct", last_activity_at: new Date() }],
  });
  const events = [];
  const repo = {
    async assertActivePair(id, actorId, transaction) {
      assert.ok(transaction);
      if (id !== conversationId || ![guest, host].includes(actorId))
        throw Object.assign(new Error("Conversation not found"), { status: 404 });
      return actorId === host ? guest : host;
    },
    async member(id, actorId) {
      return id === conversationId && [guest, host].includes(actorId) ? { user_id: actorId } : null;
    },
    async createMessage({ conversationId: id, senderId, type, body, context, clientKey, transaction }) {
      const [message, created] = await db.models.ChatMessage.findOrCreate({
        where: { sender_id: senderId, client_key: clientKey },
        defaults: { conversation_id: id, type, body, context, revision: 0 }, transaction,
      });
      return { message, created };
    },
  };
  const service = loadBackend("services/booking_proposal.service.js", db.models, {
    "repositories/chat.repository.js": repo,
    "services/chat.service.js": { publishMessage: async (id, message, event) =>
      events.push({ id, message: message.toJSON(), event }) },
  });
  return { db, service, events };
}

test("Chỉ chủ listing trong conversation tạo proposal; retry không sinh thẻ thứ hai", async () => {
  const { db, service, events } = setup();
  const input = { ...dates, client_key: randomUUID() };
  await assert.rejects(service.create(guest, "guest", conversationId, input), { status: 403 });
  await assert.rejects(service.create(outsider, "host", conversationId, input), { status: 404 });
  const quote = await service.quote(host, "host", conversationId, dates);
  assert.equal(quote.total_amount, "1200000");
  const [first, retry] = await Promise.all([
    service.create(host, "host", conversationId, input),
    service.create(host, "host", conversationId, input),
  ]);
  assert.equal(first.proposal.id, retry.proposal.id);
  assert.equal(first.proposal.customer_id, guest);
  assert.equal(first.proposal.renter_name, dates.renter_name);
  assert.equal(first.proposal.renter_phone, dates.renter_phone);
  const customerView = await service.detail(guest, conversationId, first.proposal.id);
  assert.equal(customerView.renter_name, dates.renter_name);
  assert.equal(customerView.renter_phone, dates.renter_phone);
  await assert.rejects(service.detail(outsider, conversationId, first.proposal.id), { status: 404 });
  assert.equal(db.rows("BookingProposal").length, 1);
  assert.equal(db.rows("ChatMessage").length, 1);
  assert.equal(db.rows("ChatMessage")[0].context.renter_phone, undefined);
  assert.equal(db.rows("BookingProposalEvent").length, 1);
  assert.equal(events.length, 1);
  await assert.rejects(service.create(host, "host", conversationId,
    { ...input, guests_count: 1 }), { status: 409 });
  await assert.rejects(service.create(host, "host", conversationId,
    { ...input, renter_phone: "0987654321" }), { status: 409 });
  await db.models.Listing.update({ host_id: outsider }, { where: { id: listingId } });
  await assert.rejects(service.create(host, "host", conversationId,
    { ...input, client_key: randomUUID() }), { status: 403 });
});

test("Danh sách chọn phòng lấy mọi thẻ listing, khử trùng ID và tìm phòng khác thuộc quyền quản lý", async () => {
  const { db, service } = setup();
  await db.models.Listing.create({ id: secondListingId, host_id: host, title: "Nhà ven hồ",
    city: "Đà Lạt", country: "Việt Nam", status: "published", deleted_at: null,
    max_guests: 4, price_per_night: "800000" });
  await db.models.Listing.create({ id: thirdListingId, host_id: host, title: "Căn hộ biển",
    city: "Đà Nẵng", country: "Việt Nam", status: "published", deleted_at: null,
    max_guests: 2, price_per_night: "500000" });
  const foreignId = randomUUID();
  await db.models.Listing.create({ id: foreignId, host_id: outsider, title: "Phòng người khác",
    city: "Huế", country: "Việt Nam", status: "published", deleted_at: null });
  for (const id of [listingId, secondListingId, listingId, foreignId]) {
    await db.models.ChatMessage.create({ conversation_id: conversationId,
      type: "shared_context", context: { type: "listing", id } });
  }
  await db.models.ChatMessage.create({ conversation_id: conversationId,
    type: "text", body: `Phòng ${thirdListingId}` });
  await db.models.ListingImage.create({ listing_id: secondListingId, url: "https://example.test/room.jpg" });
  const candidates = await service.candidates(host, "host", conversationId);
  assert.deepEqual(new Set(candidates.shared.map((item) => item.id)), new Set([listingId, secondListingId]));
  assert.equal(candidates.shared.length, 2);
  assert.equal(candidates.shared.find((item) => item.id === secondListingId).image_url,
    "https://example.test/room.jpg");
  assert.deepEqual(candidates.other.map((item) => item.id), [thirdListingId]);
  const search = await service.candidates(host, "host", conversationId, "biển");
  assert.deepEqual(search.other.map((item) => item.id), [thirdListingId]);
});

test("Chat không có thẻ phòng vẫn tìm được phòng; phòng ngừng nhận khách không thể báo giá", async () => {
  const { db, service } = setup();
  const empty = await service.candidates(host, "host", conversationId);
  assert.equal(empty.shared.length, 0);
  assert.deepEqual(empty.other.map((item) => item.id), [listingId]);
  await db.models.ChatMessage.create({ conversation_id: conversationId,
    type: "shared_context", context: { type: "listing", id: listingId } });
  await db.models.Listing.update({ status: "paused" }, { where: { id: listingId } });
  const paused = await service.candidates(host, "host", conversationId);
  assert.equal(paused.shared[0].status, "paused");
  await assert.rejects(service.quote(host, "host", conversationId, dates), { status: 404 });
  await assert.rejects(service.create(host, "host", conversationId,
    { ...dates, client_key: randomUUID() }), { status: 404 });
  assert.equal(db.rows("BookingProposal").length, 0);
});

test("Phòng kín lịch và ID không thuộc chủ nhà đều bị backend từ chối", async () => {
  const { db, service } = setup();
  await assert.rejects(service.candidates(guest, "guest", conversationId), { status: 403 });
  await assert.rejects(service.candidates(outsider, "host", conversationId), { status: 404 });
  const foreignId = randomUUID();
  await db.models.Listing.create({ id: foreignId, host_id: outsider, title: "Phòng người khác",
    city: "Huế", country: "Việt Nam", status: "published", deleted_at: null,
    max_guests: 2, price_per_night: "500000" });
  await assert.rejects(service.quote(host, "host", conversationId,
    { ...dates, listing_id: foreignId }), { status: 403 });
  await db.models.Booking.create({ listing_id: listingId, guest_id: outsider,
    check_in: dates.check_in, check_out: dates.check_out, status: "confirmed" });
  await assert.rejects(service.quote(host, "host", conversationId, dates),
    { status: 409, message: "Dates are not available" });
  await assert.rejects(service.create(host, "host", conversationId,
    { ...dates, client_key: randomUUID() }), { status: 409 });
});

test("ID phòng chủ nhà chọn được giữ nguyên từ đề xuất tới booking", async () => {
  const { db, service } = setup();
  await db.models.Listing.create({ id: secondListingId, host_id: host, title: "Nhà ven hồ",
    city: "Đà Lạt", country: "Việt Nam", status: "published", deleted_at: null,
    max_guests: 4, price_per_night: "800000" });
  const input = { ...dates, listing_id: secondListingId, client_key: randomUUID() };
  const { proposal } = await service.create(host, "host", conversationId, input);
  assert.equal(proposal.listing_id, secondListingId);
  assert.equal(proposal.listing.id, secondListingId);
  await service.act(guest, conversationId, proposal.id, "confirm", { version: 1 });
  assert.equal(db.rows("Booking")[0].listing_id, secondListingId);
});

test("Khách xác nhận hai lần chỉ tạo một booking chờ thanh toán", async () => {
  const { db, service } = setup();
  const { proposal } = await service.create(host, "host", conversationId,
    { ...dates, client_key: randomUUID() });
  await assert.rejects(service.act(host, conversationId, proposal.id, "confirm", { version: 1 }),
    { status: 403 });
  await assert.rejects(service.act(outsider, conversationId, proposal.id, "confirm", { version: 1 }),
    { status: 404 });
  const results = await Promise.all([
    service.act(guest, conversationId, proposal.id, "confirm", { version: 1 }),
    service.act(guest, conversationId, proposal.id, "confirm", { version: 1 }),
  ]);
  assert.equal(results[0].proposal.booking_id, results[1].proposal.booking_id);
  assert.equal(results[0].proposal.status, "BOOKING_CREATED");
  assert.equal(db.rows("Booking").length, 1);
  assert.equal(db.rows("Booking")[0].status, "pending_payment");
  assert.equal(db.rows("Booking")[0].guest_id, guest);
  assert.equal(db.rows("BookingProposalEvent").filter((item) => item.event === "BOOKING_CREATED").length, 1);
});

test("Yêu cầu sửa tăng phiên bản, xác nhận bản cũ bị từ chối", async () => {
  const { db, service } = setup();
  const { proposal } = await service.create(host, "host", conversationId,
    { ...dates, client_key: randomUUID() });
  const changed = await service.act(guest, conversationId, proposal.id,
    "request-changes", { version: 1, note: "Đổi ngày trả" });
  assert.equal(changed.proposal.status, "CUSTOMER_REQUESTED_CHANGES");
  const updated = await service.update(host, "host", conversationId, proposal.id,
    { ...dates, check_out: "2099-01-04", renter_name: "Trần Thị B",
      renter_phone: "0987654321", version: 1 });
  assert.equal(updated.proposal.version, 2);
  assert.equal(updated.proposal.renter_name, "Trần Thị B");
  assert.equal(updated.proposal.renter_phone, "0987654321");
  await assert.rejects(service.act(guest, conversationId, proposal.id, "confirm", { version: 1 }),
    { status: 409 });
  await service.act(guest, conversationId, proposal.id, "confirm", { version: 2 });
  assert.equal(db.rows("Booking")[0].check_out, "2099-01-04");
});

test("Giá hoặc lịch đổi sau khi gửi không tạo booking với dữ liệu cũ", async () => {
  const { db, service } = setup();
  const { proposal } = await service.create(host, "host", conversationId,
    { ...dates, client_key: randomUUID() });
  await db.models.Listing.update({ price_per_night: "700000" }, { where: { id: listingId } });
  const stale = await service.act(guest, conversationId, proposal.id, "confirm", { version: 1 });
  assert.equal(stale.proposal.status, "NEEDS_RECONFIRMATION");
  assert.equal(stale.proposal.failure_reason, "PRICE_CHANGED");
  assert.equal(db.rows("Booking").length, 0);
  const refreshed = await service.update(host, "host", conversationId, proposal.id,
    { ...dates, version: 1 });
  assert.equal(refreshed.proposal.total_amount, "1400000");
  await db.models.Booking.create({ listing_id: listingId, guest_id: outsider,
    check_in: dates.check_in, check_out: dates.check_out, status: "confirmed" });
  const unavailable = await service.act(guest, conversationId, proposal.id,
    "confirm", { version: 2 });
  assert.equal(unavailable.proposal.failure_reason, "UNAVAILABLE");
  assert.equal(db.rows("Booking").length, 1);
});

test("Quyền chủ nhà bị thu hồi trước lúc xác nhận không tạo booking", async () => {
  const { db, service } = setup();
  const { proposal } = await service.create(host, "host", conversationId,
    { ...dates, client_key: randomUUID() });
  await db.models.User.update({ role: "guest" }, { where: { id: host } });
  const result = await service.act(guest, conversationId, proposal.id,
    "confirm", { version: 1 });
  assert.equal(result.proposal.status, "NEEDS_RECONFIRMATION");
  assert.equal(result.proposal.failure_reason, "LISTING_CHANGED");
  assert.equal(db.rows("Booking").length, 0);
});

test("Gửi message thất bại thì proposal và audit cùng được hoàn tác", async () => {
  const { db, service } = setup();
  db.failNextWrite("ChatMessage");
  await assert.rejects(service.create(host, "host", conversationId,
    { ...dates, client_key: randomUUID() }));
  assert.equal(db.rows("BookingProposal").length, 0);
  assert.equal(db.rows("BookingProposalEvent").length, 0);
  assert.equal(db.rows("ChatMessage").length, 0);
});

test("Schema proposal loại bỏ giá và danh tính do client tự gửi", () => {
  const schema = require("../requests/api/v1/chat.schema").createProposal;
  const parsed = schema.validate({ ...dates, client_key: randomUUID(),
    customer_id: outsider, total_amount: "1", status: "BOOKING_CREATED" },
  { stripUnknown: true });
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value.customer_id, undefined);
  assert.equal(parsed.value.total_amount, undefined);
  assert.equal(parsed.value.status, undefined);
  assert.ok(schema.validate({ ...dates, client_key: randomUUID(), guests_count: 0 }).error);
  assert.ok(schema.validate({ ...dates, client_key: randomUUID(), check_in: "2099-02-30" }).error);
  assert.ok(schema.validate({ ...dates, client_key: randomUUID(), renter_name: "" }).error);
  assert.ok(schema.validate({ ...dates, client_key: randomUUID(), renter_phone: "abc" }).error);
});
