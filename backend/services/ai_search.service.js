// Chỉ dùng AI để rút tiêu chí; phòng, giá và lịch trống luôn lấy từ dữ liệu nội bộ.
const { randomUUID, createHash } = require("node:crypto");
const { AiSearchSession, AiSearchEvent, Amenity, ListingAmenity, Booking, Sequelize } = require("../models");
const listingService = require("./listing.service");
const { socialIntent, budgetMention } = require("./ai_search.language");
const { getRedis, redisReady } = require("../utils/redis");
const { criteria: criteriaSchema } = require("../requests/api/v1/ai-search.schema");
const httpError = require("../utils/httpError");

const { Op } = Sequelize;
const outputSchema = {
  type: "object",
  properties: {
    city: { type: ["string", "null"] },
    guests: { type: ["integer", "null"] },
    max_price: { type: ["integer", "null"] },
    amenities: { type: "array", items: { type: "string" } },
    check_in: { type: ["string", "null"] },
    check_out: { type: ["string", "null"] },
    near_center: { type: "boolean" },
  },
  required: ["city", "guests", "max_price", "amenities", "check_in", "check_out", "near_center"],
  additionalProperties: false,
};

const localQuota = new Map();
let lastPrunedDay = "";

function dayKey() { return new Date().toISOString().slice(0, 10); }
function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").toLowerCase().trim();
}

/** Tọa độ tâm thành phố lấy từ Mapbox, chỉ dùng khi kết quả địa danh khớp yêu cầu. */
async function cityCenter(query, city) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token || !query || !city) return null;
  const cacheKey = normalized(city);
  const params = new URLSearchParams({ access_token: token, types: "place,locality",
    autocomplete: "false", limit: "1", language: "vi" });
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const feature = (await response.json()).features?.[0];
    const expected = cacheKey.replace(/\s/g, "");
    const actual = normalized(feature?.text).replace(/\s/g, "");
    const lng = Number(feature?.center?.[0]);
    const lat = Number(feature?.center?.[1]);
    if (!actual || (!actual.includes(expected) && !expected.includes(actual)) ||
      !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  } catch { return null; }
}

function kilometersBetween(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Giữ hạn mức theo IP và toàn hệ thống trước khi gọi nhà cung cấp AI. */
async function consumeQuota(ip) {
  const dailyPerIp = Math.max(1, Number(process.env.AI_SEARCH_DAILY_PER_IP || 12));
  const dailyGlobal = Math.max(1, Number(process.env.AI_SEARCH_DAILY_GLOBAL || 1000));
  const day = dayKey();
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  const keys = [`ai-search:${day}:${ipHash}`, `ai-search:${day}:global`];
  if (redisReady()) {
    const allowed = await getRedis().eval(
      "local a=tonumber(redis.call('GET',KEYS[1]) or '0'); local b=tonumber(redis.call('GET',KEYS[2]) or '0'); if a>=tonumber(ARGV[1]) or b>=tonumber(ARGV[2]) then return 0 end; redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],86400); redis.call('INCR',KEYS[2]); redis.call('EXPIRE',KEYS[2],86400); return 1",
      { keys, arguments: [String(dailyPerIp), String(dailyGlobal)] },
    );
    if (!allowed) throw httpError(429, "Đã hết lượt tìm kiếm AI hôm nay");
    return;
  }
  if (process.env.NODE_ENV === "production") throw httpError(503, "Tìm kiếm AI tạm thời không khả dụng");
  if (localQuota.size > 2000) localQuota.clear();
  const ipCount = localQuota.get(keys[0]) || 0;
  const globalCount = localQuota.get(keys[1]) || 0;
  if (ipCount >= dailyPerIp || globalCount >= dailyGlobal) throw httpError(429, "Đã hết lượt tìm kiếm AI hôm nay");
  localQuota.set(keys[0], ipCount + 1);
  localQuota.set(keys[1], globalCount + 1);
}

/** Yêu cầu LLM trả dữ liệu có cấu trúc rồi kiểm tra lại ở phía máy chủ. */
async function extractCriteria(message, previous) {
  const useGemini = Boolean(process.env.GEMINI_API_KEY);
  const key = useGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
  if (!key) throw httpError(503, "Tìm kiếm AI chưa được cấu hình");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const instruction = `Trích tiêu chí tìm homestay từ lời người dùng. Hôm nay là ${today} tại Việt Nam. Giá là VND mỗi đêm. Trả đủ các trường schema. Giữ tiêu chí cũ khi câu mới không thay đổi chúng; khi người dùng bỏ một tiêu chí thì đặt null hoặc mảng rỗng. Giá "600 nghìn", "600k" và "600.000đ" đều là 600000 VND/đêm; "1,5 triệu" là 1500000 VND/đêm. Nếu thiếu đơn vị như "dưới 600", không tự suy ra là nghìn. Chỉ lấy ngày cụ thể có thể suy ra chắc chắn; nếu thiếu một trong hai ngày thì đặt cả hai null. Không bịa phòng, giá, tiện nghi hay lịch trống. "gần trung tâm" chỉ đặt near_center=true.`;
  const input = JSON.stringify({ previous: previous || null, message });
  let response;
  try {
    response = await fetch(useGemini
      ? "https://generativelanguage.googleapis.com/v1beta/interactions"
      : "https://api.openai.com/v1/responses", {
      method: "POST",
      headers: useGemini
        ? { "x-goog-api-key": key, "Content-Type": "application/json" }
        : { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify(useGemini ? {
        model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
        store: false,
        input: `${instruction}\n\nYêu cầu người dùng (JSON): ${input}`,
        response_format: { type: "text", mime_type: "application/json", schema: outputSchema },
      } : {
        model: process.env.AI_SEARCH_MODEL || "gpt-4o-mini",
        store: false,
        max_output_tokens: 300,
        input: [
          { role: "system", content: instruction },
          { role: "user", content: input },
        ],
        text: { format: { type: "json_schema", name: "room_search_criteria", strict: true, schema: outputSchema } },
      }),
    });
  } catch {
    throw httpError(502, "Không thể phân tích yêu cầu lúc này");
  }
  if (!response.ok) throw httpError(502, "Dịch vụ phân tích yêu cầu đang lỗi");
  let data;
  try { data = await response.json(); } catch { throw httpError(502, "Phản hồi AI không hợp lệ"); }
  const content = useGemini
    ? data.steps?.filter((step) => step.type === "model_output").flatMap((step) => step.content || []).find((part) => part.type === "text")?.text
    : data.output?.flatMap((item) => item.content || []).find((part) => part.type === "output_text")?.text;
  if (data.status !== "completed" || !content) throw httpError(502, "AI chưa phân tích được yêu cầu");
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw httpError(502, "Phản hồi AI không hợp lệ"); }
  const { error, value } = criteriaSchema.validate(parsed, { abortEarly: false, stripUnknown: false });
  if (error) throw httpError(502, "Tiêu chí AI trả về không hợp lệ");
  if (value.check_in && value.check_in < today) throw httpError(400, "Ngày nhận phòng phải từ hôm nay trở đi");
  return value;
}

async function pruneOldSessions() {
  const day = dayKey();
  if (lastPrunedDay === day) return;
  try {
    await AiSearchSession.destroy({ where: { created_at: { [Op.lt]: new Date(Date.now() - 30 * 86400000) } } });
    lastPrunedDay = day;
  } catch (error) { console.error("[ai-search] cleanup failed:", error.name); }
}

/** Lấy ứng viên qua tìm kiếm hiện có; điểm phù hợp chỉ dùng thuộc tính đã lưu trong database. */
async function search({ message, previous, ip }) {
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) throw httpError(503, "Tìm kiếm AI chưa được cấu hình");
  const social = socialIntent(normalized(message));
  if (social) return { search_id: null, criteria: { city: null, guests: null, max_price: null,
    amenities: [], check_in: null, check_out: null, near_center: false, ...previous }, items: [], intent: social };
  await consumeQuota(ip);
  const criteria = await extractCriteria(message, previous);
  const budget = budgetMention(normalized(message));
  if (budget?.ambiguous) return { search_id: null, criteria: { ...criteria, max_price: previous?.max_price ?? null },
    items: [], intent: "clarify_budget", amount: budget.ambiguous };
  if (budget?.amount) criteria.max_price = budget.amount;
  if (!criteria.city && !criteria.guests && !criteria.max_price &&
    !criteria.amenities.length && !criteria.check_in) {
    return { search_id: null, criteria, items: [], intent: "needs_details" };
  }
  const allAmenities = await Amenity.findAll({ where: { is_active: true }, attributes: ["id", "name", "slug"] });
  const requested = criteria.amenities.map((term) => {
    const key = normalized(term);
    return allAmenities.find((item) => normalized(item.name) === key || normalized(item.slug) === key)
      || allAmenities.find((item) => normalized(item.name).includes(key) || normalized(item.slug).includes(key));
  });
  const unmatchedAmenities = criteria.amenities.filter((_, index) => !requested[index]);
  const wantedIds = [...new Set(requested.filter(Boolean).map((item) => String(item.id)))];
  const filters = {
    city: criteria.city, guests: criteria.guests, max_price: criteria.max_price,
    check_in: criteria.check_in, check_out: criteria.check_out,
    sort: "rating_desc", limit: 50,
  };
  const candidates = [];
  const maxPages = criteria.check_in ? 1 : 2;
  let totalPages = 0;
  if (!unmatchedAmenities.length) {
    for (let page = 1; page <= maxPages; page += 1) {
      const result = await listingService.list({ ...filters, page });
      totalPages = result.meta.total_pages;
      candidates.push(...result.items.map((item) => item.toJSON ? item.toJSON() : item));
      if (page >= totalPages) break;
    }
  }
  const countries = new Set(candidates.map((item) => item.country).filter(Boolean));
  const center = criteria.near_center && countries.size === 1
    ? await cityCenter(`${criteria.city}, ${[...countries][0]}`, criteria.city) : null;
  const links = candidates.length && wantedIds.length
    ? await ListingAmenity.findAll({ where: { listing_id: { [Op.in]: candidates.map((item) => item.id) }, amenity_id: { [Op.in]: wantedIds } }, attributes: ["listing_id", "amenity_id"] })
    : [];
  const matched = new Map();
  for (const link of links) {
    const id = String(link.listing_id);
    if (!matched.has(id)) matched.set(id, new Set());
    matched.get(id).add(String(link.amenity_id));
  }
  const items = candidates.filter((item) => wantedIds.every((id) => matched.get(String(item.id))?.has(id)))
    .map((item) => {
      const price = Number(item.stay_price_total || item.price_per_night) / (item.stay_nights || 1);
      const rating = Number(item.avg_rating || 0);
      const lat = item.lat == null ? NaN : Number(item.lat);
      const lng = item.lng == null ? NaN : Number(item.lng);
      const distance = center && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
        ? kilometersBetween(center.lat, center.lng, lat, lng) : null;
      const priceScore = criteria.max_price ? Math.max(0, 1 - price / criteria.max_price) : 0;
      const score = wantedIds.length * 3 + rating + priceScore +
        (criteria.near_center && center ? distance == null ? -1 : Math.max(0, 5 - distance) : 0);
      const reasons = [
        ...(criteria.city ? [{ type: "city", value: item.city }] : []),
        ...(criteria.guests ? [{ type: "guests", value: item.max_guests }] : []),
        ...requested.filter(Boolean).map((amenity) => ({ type: "amenity", value: amenity.name })),
        ...(distance != null ? [{ type: "distance", value: Number(distance.toFixed(1)) }] : []),
        ...(rating > 0 ? [{ type: "rating", value: rating.toFixed(1) }] : []),
      ];
      return { ...item, reasons, score };
    })
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .slice(0, 12).map(({ score, ...item }) => item);
  const searchId = randomUUID();
  await AiSearchSession.create({ id: searchId, criteria, result_ids: items.map((item) => item.id), created_at: new Date() });
  await pruneOldSessions();
  return { search_id: searchId, criteria, items, intent: "results", unmatched_amenities: unmatchedAmenities,
    unverified_near_center: criteria.near_center && (!center || items.some((item) => !item.reasons.some((reason) => reason.type === "distance"))),
    limited_to_first: totalPages > maxPages };
}

/** Chỉ nhận click vào phòng thuộc kết quả vừa tạo. */
async function recordClick(searchId, listingId) {
  const session = await AiSearchSession.findByPk(searchId);
  if (!session || Date.now() - new Date(session.created_at).getTime() > 86400000 ||
    !session.result_ids.includes(listingId)) throw httpError(404, "Kết quả tìm kiếm không tồn tại");
  await AiSearchEvent.create({ id: randomUUID(), search_id: searchId, listing_id: listingId, event_type: "click", created_at: new Date() });
}

/** Chỉ gắn lượt đặt thật của chính khách với kết quả đã được đề xuất. */
async function recordBooking(searchId, bookingId, userId) {
  const booking = await Booking.findOne({ where: { id: bookingId, guest_id: userId }, attributes: ["id", "listing_id"] });
  const session = await AiSearchSession.findByPk(searchId);
  if (!booking || !session || Date.now() - new Date(session.created_at).getTime() > 86400000 ||
    !session.result_ids.includes(booking.listing_id)) throw httpError(404, "Lượt đặt phòng không thuộc kết quả AI");
  await AiSearchEvent.findOrCreate({ where: { booking_id: bookingId }, defaults: {
    id: randomUUID(), search_id: searchId, listing_id: booking.listing_id,
    booking_id: bookingId, event_type: "booking", created_at: new Date(),
  } });
}

/** Tổng hợp tỷ lệ theo phiên, chỉ tính booking đã xác nhận hoặc hoàn thành. */
async function metrics() {
  await pruneOldSessions();
  const since = new Date(Date.now() - 30 * 86400000);
  const recentSearch = () => ({ model: AiSearchSession, as: "searchSession", required: true,
    attributes: [], where: { created_at: { [Op.gte]: since } } });
  const [searches, clicks, bookings] = await Promise.all([
    AiSearchSession.count({ where: { created_at: { [Op.gte]: since } } }),
    AiSearchEvent.count({ distinct: true, col: "search_id", where: { event_type: "click", created_at: { [Op.gte]: since } },
      include: [recentSearch()] }),
    AiSearchEvent.count({ distinct: true, col: "search_id", where: { event_type: "booking", created_at: { [Op.gte]: since } },
      include: [recentSearch(), { model: Booking, as: "booking", required: true, attributes: [], where: { status: { [Op.in]: ["confirmed", "completed"] } } }] }),
  ]);
  return { period_days: 30, searches, clicked_searches: clicks, booked_searches: bookings,
    click_rate: searches ? clicks / searches : 0, booking_rate: searches ? bookings / searches : 0 };
}

module.exports = { search, recordClick, recordBooking, metrics, extractCriteria };
