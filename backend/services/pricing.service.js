/** Quy tắc giá của một đêm được dùng chung cho tìm kiếm, báo giá và snapshot booking. */
const { ListingPricingRule, ListingDailyPrice, Listing, Sequelize, sequelize } = require("../models");
const hostListings = require("./host_listing.service");
const httpError = require("../utils/httpError");
const { Op } = Sequelize;

const priority = { weekday: 1, range: 2, season: 3, holiday: 4 };
const DAY_MS = 86400000;

function assertDates(start, end, maxNights = 365) {
  const parse = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
  };
  const nights = (parse(end) - parse(start)) / DAY_MS;
  if (!Number.isInteger(nights) || nights < 1 || nights > maxNights)
    throw httpError(400, "Invalid date range");
  return nights;
}

function dateAt(start, offset) {
  return new Date(Date.parse(`${start}T00:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);
}

function matchesRule(rule, date, weekday) {
  return rule.kind === "weekday" ? Number(rule.weekday) === weekday :
    rule.start_date <= date && date < rule.end_date;
}

/** Giá ngày cụ thể thắng lễ, mùa, khoảng ngày, cuối tuần rồi mới đến giá cơ sở. */
function priceForDay(listing, date, rules = [], dailyPrices = []) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const matching = rules.filter((rule) => matchesRule(rule, date, weekday))
    .sort((a, b) => priority[b.kind] - priority[a.kind] ||
      new Date(b.updated_at || 0) - new Date(a.updated_at || 0) || String(b.id).localeCompare(String(a.id)));
  const daily = dailyPrices.find((item) => item.date === date);
  const pricedRule = matching.find((rule) => rule.price_per_night != null);
  const amount = daily?.price_per_night ?? pricedRule?.price_per_night ?? listing.price_per_night;
  const minNights = Math.max(1, ...matching.map((rule) => Number(rule.min_nights) || 1));
  const maxNights = Math.min(365, ...matching.map((rule) => Number(rule.max_nights) || 365));
  if (BigInt(amount) <= 0n) throw httpError(400, "Invalid nightly price");
  return { date, price_per_night: String(amount), source: daily ? "daily" : pricedRule?.kind || "base",
    min_nights: minNights, max_nights: maxNights };
}

function quoteFromData(listing, start, end, rules = [], dailyPrices = []) {
  const count = assertDates(start, end);
  const nights = Array.from({ length: count }, (_, index) =>
    priceForDay(listing, dateAt(start, index), rules, dailyPrices));
  const minNights = Math.max(...nights.map((night) => night.min_nights));
  const maxNights = Math.min(...nights.map((night) => night.max_nights));
  if (count < minNights || count > maxNights)
    throw httpError(409, "STAY_LENGTH_RESTRICTED");
  const subtotal = nights.reduce((sum, night) => sum + BigInt(night.price_per_night), 0n);
  if (subtotal <= 0n || subtotal > BigInt(Number.MAX_SAFE_INTEGER))
    throw httpError(400, "Invalid booking amount");
  return { check_in: start, check_out: end, nights, subtotal: subtotal.toString(),
    fees: "0", discount: "0", total: subtotal.toString(), currency: "VND",
    min_nights: minNights, max_nights: maxNights };
}

/** Đọc các quy tắc theo lô để Search không tạo một truy vấn cho mỗi listing. */
async function loadForListings(listingIds, start, end, transaction) {
  if (!listingIds.length) return { rules: new Map(), dailyPrices: new Map() };
  const [ruleRows, dailyRows] = await Promise.all([
    ListingPricingRule.findAll({ where: { listing_id: { [Op.in]: listingIds },
      [Op.or]: [{ kind: "weekday" }, { start_date: { [Op.lt]: end }, end_date: { [Op.gt]: start } }] }, transaction }),
    ListingDailyPrice.findAll({ where: { listing_id: { [Op.in]: listingIds },
      date: { [Op.gte]: start, [Op.lt]: end } }, transaction }),
  ]);
  const group = (rows) => {
    const result = new Map();
    for (const row of rows) {
      const key = String(row.listing_id);
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(row);
    }
    return result;
  };
  return { rules: group(ruleRows), dailyPrices: group(dailyRows) };
}

async function quoteListing(listing, start, end, transaction) {
  assertDates(start, end);
  const data = await loadForListings([listing.id], start, end, transaction);
  return quoteFromData(listing, start, end,
    data.rules.get(String(listing.id)) || [], data.dailyPrices.get(String(listing.id)) || []);
}

async function publicQuote(listingId, { check_in, check_out }) {
  assertDates(check_in, check_out);
  const listing = await Listing.findOne({ where: { id: listingId, deleted_at: null, status: "published" },
    attributes: ["id", "price_per_night"] });
  if (!listing) throw httpError(404, "Listing not found");
  return quoteListing(listing, check_in, check_out);
}

async function forHost(user, { listing_id, start_date, end_date }) {
  assertDates(start_date, end_date, 550);
  const { listing } = await hostListings.getByIdForUser(user, listing_id, { include: [] });
  const [rules, dailyPrices] = await Promise.all([
    ListingPricingRule.findAll({ where: { listing_id }, order: [["created_at", "ASC"]] }),
    ListingDailyPrice.findAll({ where: { listing_id, date: { [Op.gte]: start_date, [Op.lt]: end_date } } }),
  ]);
  const days = [];
  for (let date = start_date; date < end_date; date = dateAt(date, 1))
    days.push(priceForDay(listing, date, rules, dailyPrices));
  return { base_price: String(listing.price_per_night), rules, daily_prices: dailyPrices, days };
}

async function withHostListing(user, listingId, work) {
  return sequelize.transaction(async (transaction) => {
    await hostListings.getByIdForUser(user, listingId, {
      include: [], transaction, lock: transaction.LOCK.UPDATE,
    });
    return work(transaction);
  });
}

async function setWeekdays(user, { listing_id, friday, saturday, sunday }) {
  return withHostListing(user, listing_id, async (transaction) => {
    for (const [weekday, amount] of [[5, friday], [6, saturday], [0, sunday]]) {
      const current = await ListingPricingRule.findOne({ where: { listing_id, kind: "weekday", weekday }, transaction });
      if (amount == null) { if (current) await current.destroy({ transaction }); }
      else if (current) await current.update({ price_per_night: amount }, { transaction });
      else await ListingPricingRule.create({ listing_id, kind: "weekday", weekday,
        price_per_night: amount }, { transaction });
    }
    return { saved: true };
  });
}

async function setDay(user, { listing_id, date, price_per_night }) {
  if (date < new Date().toISOString().slice(0, 10)) throw httpError(400, "Past date");
  return withHostListing(user, listing_id, async (transaction) => {
    const current = await ListingDailyPrice.findOne({ where: { listing_id, date }, transaction });
    if (price_per_night == null) { if (current) await current.destroy({ transaction }); }
    else if (current) await current.update({ price_per_night }, { transaction });
    else await ListingDailyPrice.create({ listing_id, date, price_per_night }, { transaction });
    return { saved: true };
  });
}

async function addRange(user, { listing_id, start_date, end_date, kind, name,
  price_per_night, min_nights, max_nights }) {
  assertDates(start_date, end_date);
  if (start_date < new Date().toISOString().slice(0, 10)) throw httpError(400, "Past date");
  return withHostListing(user, listing_id, (transaction) => ListingPricingRule.create({
    listing_id, start_date, end_date, kind, name: name || null,
    price_per_night: price_per_night ?? null, min_nights: min_nights ?? null,
    max_nights: max_nights ?? null,
  }, { transaction }));
}

async function removeRange(user, { listing_id, id }) {
  return withHostListing(user, listing_id, async (transaction) => {
    const rule = await ListingPricingRule.findOne({ where: { id, listing_id,
      kind: { [Op.in]: ["range", "season", "holiday"] } }, transaction });
    if (!rule) throw httpError(404, "Pricing rule not found");
    await rule.destroy({ transaction });
    return { removed: true };
  });
}

module.exports = { assertDates, priceForDay, quoteFromData, loadForListings, quoteListing,
  publicQuote, forHost, setWeekdays, setDay, addRange, removeRange };
