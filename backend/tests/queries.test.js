const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Sequelize = require("sequelize");
const { loadBackend } = require("./helpers");

/** Sinh SQL bằng model/association thật, chặn query trước driver để không đụng DB đang chạy. */
function queryFixture() {
  const sequelize = new Sequelize("unused_test", "test", "test", { dialect: "postgres", logging: false });
  const models = { Sequelize, sequelize };
  for (const file of fs.readdirSync(path.resolve(__dirname, "../models")).filter((file) => file.endsWith(".js") && file !== "index.js")) {
    const model = require(`../models/${file}`)(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
  }
  for (const model of Object.values(models)) if (model.associate) model.associate(models);
  const queries = [];
  sequelize.query = async (sql, options) => {
    queries.push(sql);
    if (/count\(/i.test(sql) && options.plain && !sql.includes("totalBookings")) return { count: 0 };
    return options.plain ? null : [];
  };
  return { models, queries };
}

for (const file of ["admin_booking", "admin_payment", "admin_review"]) {
  test(`SQL ${file} tìm kiếm trước LIMIT, hỗ trợ UUID/enum và escape wildcard`, async () => {
    const db = queryFixture();
    const service = loadBackend(`services/${file}.service.js`, db.models);
    const result = await service.list({ q: "test%_'quote", page: 2, limit: 10 });
    assert.equal(result.meta.page, 2);
    const sql = db.queries.find((query) => query.includes("LIMIT"));
    assert.ok(sql.includes("CAST("));
    assert.ok(sql.indexOf("ILIKE") < sql.lastIndexOf("LIMIT"));
    assert.ok(sql.includes("test\\%\\_''quote"));
    assert.match(sql, /LIMIT 10 OFFSET 10/);
    if (file === "admin_payment") assert.ok(sql.includes('"booking->guest"."email"'));
  });
}

test("Rating SQL dùng cùng điều kiện công khai và không tính review/user đã xóa mềm", async () => {
  const db = queryFixture();
  const ListingRepository = loadBackend("repositories/listing.repository.js", db.models);
  const attrs = new ListingRepository().publicReviewAttributes();
  for (const [expression] of attrs) {
    assert.ok(expression.val.includes("r.deleted_at IS NULL"));
    assert.ok(expression.val.includes("reviewer.deleted_at IS NULL"));
    assert.ok(expression.val.includes("r.is_hidden = FALSE"));
    assert.ok(expression.val.includes("COALESCE(us.show_reviews, TRUE) = TRUE"));
  }
  const service = loadBackend("services/review.service.js", db.models);
  await service.listPublicByListing({ listingId: "10000000-0000-4000-8000-000000000001" });
  const sql = db.queries.find((query) => query.includes("LIMIT"));
  assert.ok(sql.includes('"Review"."deleted_at" IS NULL'));
  assert.ok(sql.includes('"reviewer"."deleted_at" IS NULL'));
  assert.ok(sql.includes('COALESCE("reviewer->setting"."show_reviews", TRUE) = TRUE'));
});

test("Booking chỉ bị khóa đánh giá khi còn review chưa xóa", () => {
  const db = queryFixture();
  const review = db.models.Review;
  const index = review.options.indexes.find((item) => item.name === "reviews_active_booking_id_unique");
  assert.equal(review.rawAttributes.booking_id.unique, undefined);
  assert.equal(index.unique, true);
  const sql = db.models.sequelize.getQueryInterface().queryGenerator.addIndexQuery("reviews", ["booking_id"], index);
  assert.match(sql, /CREATE UNIQUE INDEX/i);
  assert.match(sql, /WHERE.*deleted_at.*IS NULL/i);
});

test("Dashboard host chỉ đếm booking hợp lệ và tổng hợp payment đã thu đúng host", async () => {
  const db = queryFixture();
  const service = loadBackend("services/host.service.js", db.models);
  const hostId = "10000000-0000-4000-8000-000000000001";
  const result = await service.getDashboardStats(hostId);
  assert.equal(result.chartMonths.length, 6);
  assert.equal(result.chartValues.length, 6);
  assert.equal(result.totalBookings, 0);
  assert.equal(result.totalRevenue, 0);
  assert.deepEqual(result.recentPayments, []);
  const bookingSql = db.queries.find((sql) => sql.includes('FROM "bookings" AS "Booking"'));
  assert.match(bookingSql, /COUNT\(CASE WHEN "Booking"\.status IN \('confirmed','completed'\) THEN 1 END\)/);
  const paymentSql = db.queries.filter((sql) => sql.includes('FROM "payments" AS "Payment"'));
  assert.equal(paymentSql.length, 2);
  for (const sql of paymentSql) {
    assert.match(sql, /"Payment"\."status" = 'succeeded'/);
    assert.match(sql, /"Payment"\."currency" = 'VND'/);
    assert.ok(sql.includes(`"host_id" = '${hostId}'`));
  }
  assert.match(paymentSql[0], /GROUP BY.*COALESCE\("Payment"\."paid_at", "Payment"\."created_at"\) AT TIME ZONE 'UTC'/);
  assert.match(paymentSql[1], /ORDER BY COALESCE\("Payment"\."paid_at", "Payment"\."created_at"\) DESC/);
  assert.match(paymentSql[1], /LIMIT 5/);
});

test("Dashboard host giữ tổng tiền mọi thời kỳ và biểu đồ chỉ sáu tháng gần nhất", async () => {
  const now = new Date();
  const monthKey = (offset) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)).toISOString().slice(0, 7);
  const payment = { id: "payment-1", amount: "500000", paid_at: now, booking: { status: "confirmed" } };
  const queries = [];
  const hostId = "10000000-0000-4000-8000-000000000001";
  const service = loadBackend("services/host.service.js", {
    Sequelize,
    User: {},
    Listing: {},
    Booking: { findOne: async () => ({ totalBookings: "2", pendingBookings: "1" }) },
    Payment: { findAll: async (options) => {
      queries.push(options);
      return queries.length === 1
        ? [{ month: monthKey(-7), total: "300000" }, { month: monthKey(-5), total: "200000" }, { month: monthKey(0), total: "500000" }]
        : [payment];
    } },
  });

  const result = await service.getDashboardStats(hostId);
  assert.equal(result.totalRevenue, 1000000);
  assert.equal(result.totalBookings, 2);
  assert.equal(result.pendingBookings, 1);
  assert.equal(result.chartValues[0], 200000);
  assert.equal(result.chartValues.at(-1), 500000);
  assert.deepEqual(result.recentPayments, [payment]);
  assert.deepEqual(JSON.parse(JSON.stringify(queries[0].where)), { status: "succeeded", currency: "VND" });
  assert.equal(queries[0].include[0].include[0].where.host_id, hostId);
  assert.equal(queries[1].include[0].include[1].where.host_id, hostId);
});

test("Dashboard admin dùng tháng thanh toán cho tổng doanh thu và biểu đồ", async () => {
  const now = new Date();
  const monthKey = (offset) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)).toISOString().slice(0, 7);
  const oldMonth = monthKey(-7);
  const laterMonth = monthKey(-5);
  let rows = [{ month: laterMonth, total: "4000000" }, { month: oldMonth, total: "30000000" }];
  let paymentQuery;
  const models = {
    Sequelize,
    User: { count: async () => 18 },
    Listing: { count: async () => 1 },
    Booking: { count: async () => 1 },
    Payment: { findAll: async (options) => { paymentQuery = options; return rows; } },
  };
  const service = loadBackend("services/admin_dashboard.service.js", models);
  const result = await service.getGlobalStats();

  assert.equal(result.totalRevenue, 34000000);
  assert.equal(result.chartData[0].month, oldMonth);
  assert.equal(result.chartData[0].value, 30000000);
  assert.equal(result.chartData[1].value, 0);
  assert.equal(result.chartData[2].value, 4000000);
  assert.equal(result.chartData.at(-1).month, monthKey(0));
  assert.equal(result.chartData.reduce((sum, point) => sum + point.value, 0), result.totalRevenue);
  assert.deepEqual(JSON.parse(JSON.stringify(paymentQuery.where)), { status: "succeeded", currency: "VND" });
  assert.match(paymentQuery.attributes[0][0].val, /COALESCE\("Payment"\."paid_at", "Payment"\."created_at"\) AT TIME ZONE 'UTC'/);

  rows = [];
  const empty = await service.getGlobalStats();
  assert.equal(empty.totalRevenue, 0);
  assert.deepEqual(Array.from(empty.chartData), []);
});

test("Dashboard admin nhóm thanh toán đã ghi nhận theo tháng UTC trong SQL", async () => {
  const db = queryFixture();
  const service = loadBackend("services/admin_dashboard.service.js", db.models);
  await service.getGlobalStats();
  const sql = db.queries.find((query) => query.includes('COALESCE("Payment"."paid_at", "Payment"."created_at")'));
  assert.ok(sql);
  assert.match(sql, /AT TIME ZONE 'UTC'/);
  assert.match(sql, /GROUP BY/);
  assert.match(sql, /"Payment"\."status" = 'succeeded'/);
  assert.match(sql, /"Payment"\."currency" = 'VND'/);
});

test("Danh sách Users và thống kê admin loại trừ super_admin ngay trong SQL", async () => {
  const db = queryFixture();
  await loadBackend("services/admin_user.service.js", db.models).list();
  await loadBackend("services/admin_dashboard.service.js", db.models).getGlobalStats();
  const userQueries = db.queries.filter((sql) => /FROM "users"/.test(sql));
  assert.equal(userQueries.length, 3);
  for (const sql of userQueries) assert.match(sql, /"role" != 'super_admin'/);
});

test("API đổi vai trò không thể gán hoặc sửa tài khoản super_admin", async () => {
  const id = "10000000-0000-4000-8000-000000000001";
  let updated = false;
  const service = loadBackend("services/admin_user.service.js", {
    Sequelize,
    User: {
      findByPk: async () => ({ role: "super_admin", update: async () => { updated = true; } }),
    },
  });
  await assert.rejects(service.setRole(id, "admin"), { status: 403 });
  await assert.rejects(service.setRole(id, "super_admin"), { status: 400 });
  assert.equal(updated, false);
});

test("super_admin kế thừa quyền admin trên route", () => {
  const requireRole = loadBackend("middlewares/api/role.middleware.js", {});
  const res = { status(code) { this.code = code; return this; }, json() { return this; } };
  let passed = false;
  requireRole(["admin"])({ user: { user: { role: "super_admin" } } }, res, () => { passed = true; });
  assert.equal(passed, true);
  requireRole(["host"])({ user: { user: { role: "guest" } } }, res, () => { passed = true; });
  assert.equal(res.code, 403);
});

test("Tìm kiếm Users, Listings và Amenities lọc bằng SQL trước LIMIT", async () => {
  for (const name of ["admin_user", "admin_listing", "admin_amenity"]) {
    const db = queryFixture();
    await loadBackend(`services/${name}.service.js`, db.models).list({ q: "test%_" });
    const sql = db.queries.find((query) => /FROM "(users|listings|amenities)"/.test(query) && /LIMIT/.test(query));
    assert.ok(sql, name);
    assert.ok(sql.indexOf("ILIKE") < sql.lastIndexOf("LIMIT"), name);
    assert.ok(sql.includes("test\\%\\_"), name);
  }
});

test("Users, Listings và Amenities phân trang trong SQL và đếm toàn bộ kết quả khớp", async () => {
  for (const name of ["admin_user", "admin_listing", "admin_amenity"]) {
    const db = queryFixture();
    const result = await loadBackend(`services/${name}.service.js`, db.models).list({ q: "test", page: 2, limit: 10 });
    const rowQuery = db.queries.find((sql) => /FROM "(users|listings|amenities)"/.test(sql) && /LIMIT 10 OFFSET 10/.test(sql));
    const countQuery = db.queries.find((sql) => /FROM "(users|listings|amenities)"/.test(sql) && /count\(/i.test(sql) && !/LIMIT 10 OFFSET 10/.test(sql));
    assert.ok(rowQuery, name);
    assert.ok(countQuery, name);
    assert.equal(result.meta.page, 2, name);
    assert.equal(result.meta.limit, 10, name);
  }
});

test("Tìm kiếm Bookings và Reviews giữ các bộ lọc ID, rating trong SQL", async () => {
  const bookings = queryFixture();
  await loadBackend("services/admin_booking.service.js", bookings.models).list({ q: "test" });
  const bookingSql = bookings.queries.find((query) => /FROM "bookings"/.test(query) && /LIMIT/.test(query));
  assert.match(bookingSql, /"guest_id"/);
  assert.match(bookingSql, /"listing_id"/);

  const reviews = queryFixture();
  await loadBackend("services/admin_review.service.js", reviews.models).list({ q: "test", rating: "5" });
  const reviewSql = reviews.queries.find((query) => /FROM "reviews"/.test(query) && /LIMIT/.test(query));
  assert.match(reviewSql, /"booking_id"/);
  assert.match(reviewSql, /"rating" = 5/);
});
