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

test("Dashboard tổng hợp trong SQL và trả đủ sáu tháng dù chưa có booking", async () => {
  const db = queryFixture();
  const service = loadBackend("services/host.service.js", db.models);
  const result = await service.getDashboardStats("10000000-0000-4000-8000-000000000001");
  assert.equal(result.chartValues.length, 6);
  assert.equal(result.totalBookings, 0);
  assert.ok(db.queries.some((sql) => sql.includes("SUM(CASE WHEN")));
  assert.ok(db.queries.some((sql) => sql.includes("GROUP BY") && sql.includes("AT TIME ZONE 'UTC'")));
  assert.ok(db.queries.some((sql) => sql.includes("LIMIT 5")));
});
