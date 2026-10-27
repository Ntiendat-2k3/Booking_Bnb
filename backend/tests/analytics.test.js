const test = require("node:test");
const assert = require("node:assert/strict");
const Sequelize = require("sequelize");
const { loadBackend, database } = require("./helpers");

const hostId = "60000000-0000-4000-8000-000000000001";
const listingId = "60000000-0000-4000-8000-000000000002";
const listingId2 = "60000000-0000-4000-8000-000000000003";

function fixture() {
  const calls = [];
  const listingCalls = [];
  const models = { Sequelize,
    Listing: { findAll: async (options) => { listingCalls.push(options); return [
      { id: listingId, title: "=SUM(1+1)", status: "published", host_id: hostId },
      { id: listingId2, title: "Studio", status: "published", host_id: hostId },
    ]; } },
    sequelize: { query: async (sql, options) => {
      calls.push({ sql, options });
      const previous = options.replacements.start === "2026-09-01";
      if (sql.includes("WITH ledger")) return previous ?
        [{ scope: "listing", listing_id: listingId, gross: "700000", refunds: "0" },
          { scope: "day", day: "2026-09-04", gross: "700000", refunds: "0" }] :
        [{ scope: "listing", listing_id: listingId, gross: "1000000", refunds: "200000" },
          { scope: "listing", listing_id: listingId2, gross: "500000", refunds: "0" },
          { scope: "day", day: "2026-10-10", gross: "1000000", refunds: "200000" },
          { scope: "day", day: "2026-10-11", gross: "500000", refunds: "0" }];
      if (sql.includes("COUNT(*) FILTER")) return previous ?
        [{ listing_id: listingId, started: 1, successful: 1, cancelled: 0, completed: 0 }] :
        [{ listing_id: listingId, started: 4, successful: 2, cancelled: 1, completed: 1 },
          { listing_id: listingId2, started: 1, successful: 1, cancelled: 0, completed: 0 }];
      if (sql.includes("WITH inventory")) return [
        { scope: "listing", listing_id: listingId, available_nights: 20, sold_nights: 10, room_revenue: "800000" },
        { scope: "listing", listing_id: listingId2, available_nights: 20, sold_nights: 5, room_revenue: "500000" },
        { scope: "day", day: "2026-10-10", available_nights: 2, sold_nights: 2, room_revenue: "200000" },
        { scope: "day", day: "2026-10-11", available_nights: 2, sold_nights: 0, room_revenue: "0" },
      ];
      if (sql.includes("listing_view_events")) return [
        { listing_id: listingId, views: 100 }, { listing_id: listingId2, views: 50 }];
      throw new Error("Unexpected analytics query");
    } },
  };
  return { service: loadBackend("services/analytics.service.js", models), calls, listingCalls };
}

test("Kỳ ngày, tháng, quý, năm và kỳ trước có ranh giới UTC chính xác", () => {
  const { service } = fixture();
  assert.deepEqual(JSON.parse(JSON.stringify(service.periodRange("day", "2024-02-29"))), {
    period: "day", start: "2024-02-29", end: "2024-03-01",
    previousStart: "2024-02-28", previousEnd: "2024-02-29" });
  assert.equal(service.periodRange("month", "2024-03-15").previousStart, "2024-02-01");
  assert.equal(service.periodRange("quarter", "2026-01-15").previousStart, "2025-10-01");
  assert.equal(service.periodRange("year", "2026-06-15").end, "2027-01-01");
  assert.throws(() => service.periodRange("month", "2026-02-30"), { status: 400 });
});

test("KPI không tính booking chờ thanh toán là doanh thu và giới hạn mọi truy vấn theo Host", async () => {
  const { service, calls, listingCalls } = fixture();
  const result = await service.report({ hostId, period: "month", date: "2026-10-15" });
  assert.equal(result.totals.gross, "1500000");
  assert.equal(result.totals.refunds, "200000");
  assert.equal(result.totals.net, "1300000");
  assert.equal(result.totals.platform_fees, "0");
  assert.equal(result.previous.net, "700000");
  assert.equal(result.totals.successful, 3);
  assert.equal(result.totals.cancelled, 1);
  assert.equal(result.totals.completed, 1);
  assert.equal(result.totals.cancellation_rate, 25);
  assert.equal(result.totals.occupancy_rate, 37.5);
  assert.equal(result.totals.adr, 86667);
  assert.equal(result.totals.revpar, 32500);
  assert.equal(result.totals.conversion_rate, 2);
  assert.equal(result.top_listings[0].listing_id, listingId);
  assert.equal(result.high_demand[0].date, "2026-10-10");
  assert.equal(result.low_demand[0].date, "2026-10-11");
  assert.equal(result.chart.find((point) => point.date === "2026-10-10").net, "800000");
  assert.ok(calls.every((call) => call.options.replacements.hostId === hostId));
  assert.equal(listingCalls[0].where.host_id, hostId);
  const ledgerSql = calls.find((call) => call.sql.includes("WITH ledger")).sql;
  assert.match(ledgerSql, /p\.status IN \('succeeded', 'refunded'\)/);
  assert.match(ledgerSql, /r\.status = 'succeeded'/);
  assert.match(ledgerSql, /refund_requested/);
  assert.match(ledgerSql, /l\.host_id = :hostId/);
  assert.match(calls.find((call) => call.sql.includes("WITH inventory")).sql,
    /b\.status IN \('confirmed', 'completed'\)/);
});

test("Admin xem toàn hệ thống, Host không thể truyền phạm vi khác qua tham số kỳ", async () => {
  const { service, calls, listingCalls } = fixture();
  await service.report({ period: "month", date: "2026-10-15", admin: true });
  assert.ok(calls.every((call) => !Object.hasOwn(call.options.replacements, "hostId")));
  assert.deepEqual(JSON.parse(JSON.stringify(listingCalls[0].where)), {});
});

test("CSV giữ Unicode và vô hiệu hóa công thức trong tên phòng", async () => {
  const { service } = fixture();
  const result = await service.report({ hostId, period: "month", date: "2026-10-15" });
  const csv = service.toCsv(result);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("'=SUM(1+1)"));
  assert.ok(csv.includes("1300000"));
});

test("Một phiên chỉ ghi một lượt xem mỗi phòng mỗi ngày", async () => {
  const db = database({ Listing: [{ id: listingId, status: "published", deleted_at: null }] });
  const service = loadBackend("services/analytics.service.js", db.models);
  const key = "60000000-0000-4000-8000-000000000004";
  await service.recordView(listingId, key);
  await service.recordView(listingId, key);
  assert.equal(db.rows("ListingViewEvent").length, 1);
  await assert.rejects(service.recordView(listingId2, key), { status: 404 });
});
