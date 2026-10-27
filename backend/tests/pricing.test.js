const test = require("node:test");
const assert = require("node:assert/strict");
const { loadBackend, database } = require("./helpers");

const listingId = "30000000-0000-4000-8000-000000000001";
const hostId = "30000000-0000-4000-8000-000000000002";
const guestId = "30000000-0000-4000-8000-000000000003";
const listing = { id: listingId, host_id: hostId, title: "Studio", status: "published",
  deleted_at: null, max_guests: 3, price_per_night: "100000" };
const rule = (id, kind, extras) => ({ id, listing_id: listingId, kind, ...extras });

test("Giá theo ngày ưu tiên giá riêng, lễ, mùa, khoảng ngày, cuối tuần rồi giá cơ sở", () => {
  const pricing = loadBackend("services/pricing.service.js", database().models);
  const rules = [
    rule("1", "weekday", { weekday: 5, price_per_night: "120000" }),
    rule("2", "weekday", { weekday: 6, price_per_night: "130000" }),
    rule("3", "weekday", { weekday: 0, price_per_night: "140000" }),
    rule("4", "range", { start_date: "2099-12-25", end_date: "2099-12-29", price_per_night: "145000" }),
    rule("5", "season", { start_date: "2099-12-26", end_date: "2099-12-28", price_per_night: "160000" }),
    rule("6", "holiday", { start_date: "2099-12-26", end_date: "2099-12-27", price_per_night: "200000" }),
  ];
  const quote = pricing.quoteFromData(listing, "2099-12-25", "2099-12-30", rules,
    [{ date: "2099-12-25", price_per_night: "220000" }]);
  assert.deepEqual(Array.from(quote.nights, (night) => night.price_per_night),
    ["220000", "200000", "160000", "145000", "100000"]);
  assert.deepEqual(Array.from(quote.nights, (night) => night.source),
    ["daily", "holiday", "season", "range", "base"]);
  assert.equal(quote.total, "825000");
  const weekend = pricing.quoteFromData(listing, "2100-01-01", "2100-01-04", rules);
  assert.deepEqual(Array.from(weekend.nights, (night) => night.price_per_night),
    ["120000", "130000", "140000"]);
});

test("Giới hạn số đêm chặt nhất áp dụng khi các khoảng ngày giao nhau", () => {
  const pricing = loadBackend("services/pricing.service.js", database().models);
  const rules = [
    rule("1", "season", { start_date: "2099-12-20", end_date: "2100-01-02", min_nights: 3 }),
    rule("2", "holiday", { start_date: "2099-12-25", end_date: "2099-12-28", max_nights: 4 }),
  ];
  assert.throws(() => pricing.quoteFromData(listing, "2099-12-25", "2099-12-27", rules),
    { status: 409, message: "STAY_LENGTH_RESTRICTED" });
  assert.equal(pricing.quoteFromData(listing, "2099-12-25", "2099-12-28", rules).total, "300000");
  assert.throws(() => pricing.quoteFromData(listing, "2099-12-24", "2099-12-29", rules),
    { status: 409 });
});

test("Booking kiểm tra lại báo giá trong transaction và lưu từng đêm vào snapshot", async () => {
  const db = database({ Listing: [listing], ListingPricingRule: [
    rule("1", "weekday", { weekday: 5, price_per_night: "120000" }),
  ], ListingDailyPrice: [{ id: "2", listing_id: listingId, date: "2099-12-26", price_per_night: "180000" }] });
  const booking = loadBackend("services/booking.service.js", db.models);
  const input = { userId: guestId, listingId, check_in: "2099-12-25", check_out: "2099-12-27" };
  await assert.rejects(booking.create({ ...input, expectedTotal: "200000" }),
    { status: 409, message: "PRICE_CHANGED" });
  assert.equal(db.rows("Booking").length, 0);
  const created = await booking.create({ ...input, expectedTotal: "300000" });
  assert.equal(created.booking.total_amount, "300000");
  assert.deepEqual(Array.from(created.booking.price_breakdown_snapshot.nights,
    (night) => night.price_per_night), ["120000", "180000"]);
  assert.equal(created.booking.price_per_night_snapshot, "100000");
});

test("Host khác không thể đổi giá và Search lọc theo giá của ngày thuê", async () => {
  const second = { ...listing, id: "30000000-0000-4000-8000-000000000004", price_per_night: "200000" };
  const db = database({ Listing: [listing, second], ListingDailyPrice: [{ id: "2",
    listing_id: listingId, date: "2099-12-25", price_per_night: "300000" }] });
  db.models.Listing.findAll = async () => db.rows("Listing").map((item) =>
    ({ ...item, toJSON: () => ({ ...item }) }));
  const pricing = loadBackend("services/pricing.service.js", db.models);
  await assert.rejects(pricing.setDay({ id: guestId, role: "host" }, {
    listing_id: listingId, date: "2099-12-25", price_per_night: 400000,
  }), { status: 403 });
  const search = loadBackend("services/listing.service.js", db.models);
  const result = await search.list({ check_in: "2099-12-25", check_out: "2099-12-26",
    min_price: 250000, sort: "price_asc" });
  assert.equal(result.meta.total, 1);
  assert.equal(result.items[0].id, listingId);
  assert.equal(result.items[0].stay_price_total, "300000");
});

test("Host lưu giá cuối tuần, ngày riêng và mùa trên Calendar; xóa quy tắc trả về giá cơ sở", async () => {
  const db = database({ Listing: [listing] });
  const pricing = loadBackend("services/pricing.service.js", db.models);
  const host = { id: hostId, role: "host" };
  await pricing.setWeekdays(host, { listing_id: listingId,
    friday: 120000, saturday: 130000, sunday: null });
  await pricing.setDay(host, { listing_id: listingId, date: "2099-12-25", price_per_night: 180000 });
  const range = await pricing.addRange(host, { listing_id: listingId,
    start_date: "2099-12-26", end_date: "2099-12-28", kind: "season",
    name: "Cuối năm", price_per_night: 160000, min_nights: 2 });
  const calendar = await pricing.forHost(host, { listing_id: listingId,
    start_date: "2099-12-25", end_date: "2099-12-29" });
  assert.deepEqual(Array.from(calendar.days, (day) => day.price_per_night),
    ["180000", "160000", "160000", "100000"]);
  assert.equal(calendar.days[1].min_nights, 2);
  await pricing.removeRange(host, { listing_id: listingId, id: range.id });
  await pricing.setDay(host, { listing_id: listingId, date: "2099-12-25", price_per_night: null });
  const quote = await pricing.quoteListing(listing, "2099-12-25", "2099-12-28");
  assert.deepEqual(Array.from(quote.nights, (night) => night.price_per_night),
    ["120000", "130000", "100000"]);
});
