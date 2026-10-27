/** Tính KPI theo ngày UTC từ tiền đã thu, refund đã thành công và đêm phòng đã bán. */
const { Listing, ListingViewEvent, sequelize, Sequelize } = require("../models");
const httpError = require("../utils/httpError");

const DAY_MS = 86400000;
const dateKey = (date) => date.toISOString().slice(0, 10);
const monthKey = (date) => date.toISOString().slice(0, 7);
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

function periodRange(period = "month", date = dateKey(new Date())) {
  const selected = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(selected.getTime()) || dateKey(selected) !== date)
    throw httpError(400, "Invalid analytics date");
  const year = selected.getUTCFullYear();
  const month = selected.getUTCMonth();
  let start;
  let end;
  let previous;
  if (period === "day") {
    start = selected; end = addDays(start, 1); previous = addDays(start, -1);
  } else if (period === "month") {
    start = new Date(Date.UTC(year, month, 1));
    end = new Date(Date.UTC(year, month + 1, 1));
    previous = new Date(Date.UTC(year, month - 1, 1));
  } else if (period === "quarter") {
    const firstMonth = Math.floor(month / 3) * 3;
    start = new Date(Date.UTC(year, firstMonth, 1));
    end = new Date(Date.UTC(year, firstMonth + 3, 1));
    previous = new Date(Date.UTC(year, firstMonth - 3, 1));
  } else if (period === "year") {
    start = new Date(Date.UTC(year, 0, 1));
    end = new Date(Date.UTC(year + 1, 0, 1));
    previous = new Date(Date.UTC(year - 1, 0, 1));
  } else throw httpError(400, "Invalid analytics period");
  return { period, start: dateKey(start), end: dateKey(end),
    previousStart: dateKey(previous), previousEnd: dateKey(start) };
}

const scopeSql = (hostId) => hostId ? "AND l.host_id = :hostId" : "";
const replacements = (start, end, hostId) => ({ start, end, ...(hostId ? { hostId } : {}) });

/** Sổ tiền dùng ngày giao dịch; payment bất thường đang chờ hoàn không thành doanh thu Host. */
async function financialRows(start, end, hostId) {
  return sequelize.query(`WITH ledger AS (
    SELECT b.listing_id, (COALESCE(p.paid_at, p.created_at) AT TIME ZONE 'UTC')::date AS day,
      p.amount::numeric AS gross, 0::numeric AS refunds
    FROM payments p JOIN bookings b ON b.id = p.booking_id
      JOIN listings l ON l.id = b.listing_id
    WHERE p.status IN ('succeeded', 'refunded') AND p.currency = 'VND'
      AND p.payload->>'refund_requested' IS NULL
      AND COALESCE(p.paid_at, p.created_at) >= (CAST(:start AS date)::timestamp AT TIME ZONE 'UTC')
      AND COALESCE(p.paid_at, p.created_at) < (CAST(:end AS date)::timestamp AT TIME ZONE 'UTC')
      ${scopeSql(hostId)}
    UNION ALL
    SELECT b.listing_id, (COALESCE(r.provider_updated_at, r.updated_at) AT TIME ZONE 'UTC')::date,
      0::numeric, r.amount::numeric
    FROM refunds r JOIN payments p ON p.id = r.payment_id
      JOIN bookings b ON b.id = r.booking_id JOIN listings l ON l.id = b.listing_id
    WHERE r.status = 'succeeded' AND r.currency = 'VND'
      AND p.payload->>'refund_requested' IS NULL
      AND COALESCE(r.provider_updated_at, r.updated_at) >= (CAST(:start AS date)::timestamp AT TIME ZONE 'UTC')
      AND COALESCE(r.provider_updated_at, r.updated_at) < (CAST(:end AS date)::timestamp AT TIME ZONE 'UTC')
      ${scopeSql(hostId)}
  ) SELECT CASE WHEN GROUPING(listing_id) = 0 THEN 'listing' ELSE 'day' END AS scope,
    CASE WHEN GROUPING(listing_id) = 0 THEN listing_id::text END AS listing_id,
    CASE WHEN GROUPING(day) = 0 THEN day::text END AS day,
    SUM(gross)::text AS gross, SUM(refunds)::text AS refunds
    FROM ledger GROUP BY GROUPING SETS ((listing_id), (day))`, {
    replacements: replacements(start, end, hostId), type: Sequelize.QueryTypes.SELECT,
  });
}

async function bookingRows(start, end, hostId) {
  return sequelize.query(`SELECT b.listing_id,
    COUNT(*)::integer AS started,
    COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed'))::integer AS successful,
    COUNT(*) FILTER (WHERE b.status = 'cancelled')::integer AS cancelled,
    COUNT(*) FILTER (WHERE b.status = 'completed')::integer AS completed
    FROM bookings b JOIN listings l ON l.id = b.listing_id
    WHERE b.created_at >= (CAST(:start AS date)::timestamp AT TIME ZONE 'UTC')
      AND b.created_at < (CAST(:end AS date)::timestamp AT TIME ZONE 'UTC')
      ${scopeSql(hostId)} GROUP BY b.listing_id`, {
    replacements: replacements(start, end, hostId), type: Sequelize.QueryTypes.SELECT,
  });
}

/** GROUPING SETS trả một dòng mỗi phòng và mỗi ngày, tránh gửi toàn bộ đêm phòng về Node. */
async function occupancyRows(start, end, hostId) {
  return sequelize.query(`WITH inventory AS (
    SELECT l.id AS listing_id, d.day::date AS day
    FROM listings l CROSS JOIN LATERAL generate_series(
      GREATEST(CAST(:start AS date), (l.created_at AT TIME ZONE 'UTC')::date), CAST(:end AS date) - 1,
      INTERVAL '1 day') AS d(day)
    WHERE (l.status = 'published' OR (l.status = 'paused'
      AND d.day::date < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date))
      AND (l.deleted_at IS NULL OR d.day::date < (l.deleted_at AT TIME ZONE 'UTC')::date)
      ${scopeSql(hostId)}
      AND NOT EXISTS (SELECT 1 FROM listing_calendar_blocks bl
        WHERE bl.listing_id = l.id AND bl.start_date <= d.day::date
          AND bl.end_date > d.day::date)
  ) SELECT CASE WHEN GROUPING(i.listing_id) = 0 THEN 'listing' ELSE 'day' END AS scope,
    CASE WHEN GROUPING(i.listing_id) = 0 THEN i.listing_id::text END AS listing_id,
    CASE WHEN GROUPING(i.day) = 0 THEN i.day::text END AS day,
    COUNT(DISTINCT (i.listing_id, i.day))::integer AS available_nights,
    COUNT(DISTINCT (i.listing_id, i.day)) FILTER (WHERE b.id IS NOT NULL)::integer AS sold_nights,
    COALESCE(SUM(b.total_amount::numeric / NULLIF(b.check_out - b.check_in, 0)), 0)::text AS room_revenue
    FROM inventory i LEFT JOIN bookings b ON b.listing_id = i.listing_id
      AND b.status IN ('confirmed', 'completed')
      AND b.check_in <= i.day AND b.check_out > i.day
    GROUP BY GROUPING SETS ((i.listing_id), (i.day))`, {
    replacements: replacements(start, end, hostId), type: Sequelize.QueryTypes.SELECT,
  });
}

async function viewRows(start, end, hostId) {
  return sequelize.query(`SELECT e.listing_id, COUNT(*)::integer AS views
    FROM listing_view_events e JOIN listings l ON l.id = e.listing_id
    WHERE e.viewed_on >= CAST(:start AS date) AND e.viewed_on < CAST(:end AS date)
      ${scopeSql(hostId)} GROUP BY e.listing_id`, {
    replacements: replacements(start, end, hostId), type: Sequelize.QueryTypes.SELECT,
  });
}

const ratio = (numerator, denominator) => denominator ?
  Math.round(numerator / denominator * 10000) / 100 : 0;
const moneyRatio = (amount, nights) => nights ? Math.round(Number(amount) / nights) : 0;
const empty = () => ({ gross: 0n, refunds: 0n, started: 0, successful: 0,
  cancelled: 0, completed: 0, views: 0, available_nights: 0, sold_nights: 0,
  room_revenue: 0 });

function summarize(finance, bookings, views, occupancy) {
  const value = empty();
  for (const row of finance) { value.gross += BigInt(row.gross); value.refunds += BigInt(row.refunds); }
  for (const row of bookings) for (const key of ["started", "successful", "cancelled", "completed"])
    value[key] += Number(row[key] || 0);
  for (const row of views) value.views += Number(row.views || 0);
  for (const row of occupancy) {
    value.available_nights += Number(row.available_nights || 0);
    value.sold_nights += Number(row.sold_nights || 0);
    value.room_revenue += Number(row.room_revenue || 0);
  }
  return { gross: value.gross.toString(), refunds: value.refunds.toString(),
    platform_fees: "0", net: (value.gross - value.refunds).toString(),
    started: value.started, successful: value.successful, cancelled: value.cancelled,
    completed: value.completed, views: value.views,
    cancellation_rate: ratio(value.cancelled, value.successful + value.cancelled),
    conversion_rate: ratio(value.successful, value.views),
    available_nights: value.available_nights, sold_nights: value.sold_nights,
    occupancy_rate: ratio(value.sold_nights, value.available_nights),
    adr: moneyRatio(value.room_revenue, value.sold_nights),
    revpar: moneyRatio(value.room_revenue, value.available_nights) };
}

function chartPoints(range, finance) {
  const monthly = range.period === "year";
  const map = new Map();
  for (const row of finance) {
    const key = monthly ? row.day.slice(0, 7) : row.day;
    map.set(key, (map.get(key) || 0n) + BigInt(row.gross) - BigInt(row.refunds));
  }
  const points = [];
  for (let current = new Date(`${range.start}T00:00:00Z`);
    dateKey(current) < range.end;
    current = monthly ? new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1)) : addDays(current, 1)) {
    const key = monthly ? monthKey(current) : dateKey(current);
    points.push({ date: key, net: (map.get(key) || 0n).toString() });
  }
  return points;
}

/** Phạm vi Host luôn đến từ tài khoản xác thực; Admin truyền null để xem toàn hệ thống. */
async function report({ hostId = null, period = "month", date, admin = false } = {}) {
  const range = periodRange(period, date || dateKey(new Date()));
  const [listings, finance, previousFinance, bookings, previousBookings,
    occupancy, previousOccupancy, views, previousViews] =
    await Promise.all([
      Listing.findAll({ where: hostId ? { host_id: hostId } : {},
        attributes: ["id", "title", "status", "host_id"], paranoid: false, raw: true }),
      financialRows(range.start, range.end, hostId),
      financialRows(range.previousStart, range.previousEnd, hostId),
      bookingRows(range.start, range.end, hostId),
      bookingRows(range.previousStart, range.previousEnd, hostId),
      occupancyRows(range.start, range.end, hostId),
      occupancyRows(range.previousStart, range.previousEnd, hostId),
      viewRows(range.start, range.end, hostId),
      viewRows(range.previousStart, range.previousEnd, hostId),
    ]);
  const listingMap = new Map(listings.map((item) => [String(item.id), item]));
  const currentFinanceListings = finance.filter((item) => item.scope === "listing");
  const previousFinanceListings = previousFinance.filter((item) => item.scope === "listing");
  const byListing = (rows) => {
    const map = new Map();
    for (const row of rows) {
      const id = String(row.listing_id);
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    }
    return map;
  };
  const f = byListing(currentFinanceListings);
  const b = byListing(bookings);
  const v = byListing(views);
  const o = byListing(occupancy.filter((item) => item.scope === "listing"));
  const performance = [...listingMap.values()].map((listing) => ({
    listing_id: listing.id, title: listing.title, status: listing.status,
    ...summarize(f.get(String(listing.id)) || [], b.get(String(listing.id)) || [],
      v.get(String(listing.id)) || [], o.get(String(listing.id)) || []),
  })).sort((a, b) => BigInt(a.net) > BigInt(b.net) ? -1 : BigInt(a.net) < BigInt(b.net) ? 1 : 0);
  const demand = occupancy.filter((item) => item.scope === "day" && Number(item.available_nights) > 0)
    .map((item) => ({ date: item.day, available_nights: Number(item.available_nights),
      sold_nights: Number(item.sold_nights), occupancy_rate: ratio(Number(item.sold_nights), Number(item.available_nights)) }));
  const highDemand = [...demand].sort((a, b) => b.occupancy_rate - a.occupancy_rate ||
    b.sold_nights - a.sold_nights || a.date.localeCompare(b.date)).slice(0, 5);
  const lowDemand = [...demand].sort((a, b) => a.occupancy_rate - b.occupancy_rate ||
    a.sold_nights - b.sold_nights || a.date.localeCompare(b.date)).slice(0, 5);
  return { period: range.period, start: range.start, end: range.end,
    definitions: { timezone: "UTC", platform_fee_configured: false,
      conversion: "paid_bookings_created_in_period / unique_listing_views_in_period",
      revenue: "successful_payments_minus_successful_refunds",
      inventory: "current_listing_status_and_calendar_blocks" },
    totals: summarize(currentFinanceListings, bookings, views,
      occupancy.filter((item) => item.scope === "listing")),
    previous: summarize(previousFinanceListings, previousBookings, previousViews,
      previousOccupancy.filter((item) => item.scope === "listing")),
    chart: chartPoints(range, finance.filter((item) => item.scope === "day")),
    high_demand: highDemand, low_demand: lowDemand,
    top_listings: performance.slice(0, 5), listings: admin ? performance.slice(0, 10) : performance };
}

async function recordView(listingId, visitorKey) {
  const listing = await Listing.findOne({ where: { id: listingId, status: "published", deleted_at: null },
    attributes: ["id"] });
  if (!listing) throw httpError(404, "Listing not found");
  await ListingViewEvent.findOrCreate({ where: { listing_id: listingId,
    visitor_key: visitorKey, viewed_on: dateKey(new Date()) } });
}

function toCsv(data) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[=+@-]/.test(text) && !/^-\d+(\.\d+)?$/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const rows = [["Kỳ", data.start, data.end],
    ["Tổng", data.totals.gross, data.totals.refunds, data.totals.platform_fees, data.totals.net,
      data.totals.successful, data.totals.cancelled, data.totals.completed, data.totals.occupancy_rate,
      data.totals.adr, data.totals.revpar, data.totals.views, data.totals.started],
    ["ID phòng", "Tên phòng", "Doanh thu gộp", "Hoàn tiền", "Phí nền tảng", "Doanh thu ròng",
      "Booking thành công", "Đã hủy", "Hoàn thành", "Lấp đầy (%)", "ADR", "RevPAR", "Lượt xem", "Bắt đầu đặt"],
    ...data.listings.map((item) => [item.listing_id, item.title, item.gross, item.refunds,
      item.platform_fees, item.net, item.successful, item.cancelled, item.completed,
      item.occupancy_rate, item.adr, item.revpar, item.views, item.started])];
  return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}`;
}

module.exports = { periodRange, report, recordView, toCsv,
  summarize, chartPoints };
