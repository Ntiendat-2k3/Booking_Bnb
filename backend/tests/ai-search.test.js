const test = require("node:test");
const assert = require("node:assert/strict");
const Sequelize = require("sequelize");
const { loadBackend } = require("./helpers");
const { criteria, searchRequest } = require("../requests/api/v1/ai-search.schema");
const { budgetMention } = require("../services/ai_search.language");

const listingId = "10000000-0000-4000-8000-000000000001";
const otherId = "10000000-0000-4000-8000-000000000002";
const amenityId = "10000000-0000-4000-8000-000000000003";

test("AI chỉ trả phòng có tiện nghi thật và dùng bộ lọc ngày, giá hiện có", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  const sessions = [];
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.max_output_tokens, 300);
    return {
      ok: true,
      json: async () => ({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  city: "Đà Lạt",
                  guests: 4,
                  max_price: 1500000,
                  amenities: ["Bếp"],
                  check_in: "2099-01-10",
                  check_out: "2099-01-12",
                  near_center: true,
                }),
              },
            ],
          },
        ],
      }),
    };
  };
  try {
    const service = loadBackend(
      "services/ai_search.service.js",
      {
        Sequelize,
        AiSearchSession: {
          create: async (row) => sessions.push(row),
          destroy: async () => 0,
        },
        AiSearchEvent: {},
        Booking: {},
        Amenity: {
          findAll: async () => [{ id: amenityId, name: "Bếp", slug: "bep" }],
        },
        ListingAmenity: {
          findAll: async () => [
            { listing_id: listingId, amenity_id: amenityId },
          ],
        },
      },
      {
        "services/listing.service.js": {
          list: async (filters) => {
            calls.push(filters);
            return {
              items: [
                {
                  id: listingId,
                  city: "Đà Lạt",
                  max_guests: 4,
                  stay_price_total: "2800000",
                  stay_nights: 2,
                  avg_rating: 4.8,
                },
                {
                  id: otherId,
                  city: "Đà Lạt",
                  max_guests: 5,
                  stay_price_total: "2500000",
                  stay_nights: 2,
                  avg_rating: 5,
                },
              ],
              meta: { total_pages: 1 },
            };
          },
        },
        "utils/redis.js": { redisReady: () => false, getRedis: () => null },
      },
      { OPENAI_API_KEY: "test-key", NODE_ENV: "test" },
    );
    const result = await service.search({
      message: "Tìm phòng ở Đà Lạt cho 4 người, có bếp",
      ip: "127.0.0.1",
    });
    assert.deepEqual(
      Array.from(result.items, (item) => item.id),
      [listingId],
    );
    assert.equal(result.unverified_near_center, true);
    assert.equal(calls[0].check_in, "2099-01-10");
    assert.equal(calls[0].max_price, 1500000);
    assert.deepEqual(Array.from(sessions[0].result_ids), [listingId]);
    assert.equal(JSON.stringify(sessions[0]).includes("Tìm phòng"), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("schema từ chối ngày thiếu cặp và dữ liệu AI ngoài giới hạn", () => {
  const base = {
    city: "Đà Lạt",
    guests: 4,
    max_price: 1500000,
    amenities: [],
    near_center: false,
  };
  assert.ok(
    criteria.validate({ ...base, check_in: "2099-01-10", check_out: null })
      .error,
  );
  assert.ok(
    criteria.validate({
      ...base,
      check_in: null,
      check_out: null,
      guests: 1000,
    }).error,
  );
  assert.equal(
    criteria.validate({ ...base, check_in: null, check_out: null }).error,
    undefined,
  );
});

test("lượt tìm đầu không cần previous, lượt hỏi tiếp vẫn kiểm tra tiêu chí cũ", () => {
  assert.equal(searchRequest.validate({ message: "hello" }).error, undefined);
  assert.ok(searchRequest.validate({ message: "hello", previous: { guests: 1000 } }).error);
});

test("Gemini phân tích tiêu chí có cấu trúc và được ưu tiên khi có cả hai khóa", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      json: async () => ({
        status: "completed",
        steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({
          city: "Đà Lạt", guests: 4, max_price: 1500000, amenities: ["Bếp"],
          check_in: null, check_out: null, near_center: false,
        }) }] }],
      }),
    };
  };
  try {
    const service = loadBackend("services/ai_search.service.js", { Sequelize }, {}, {
      GEMINI_API_KEY: "gemini-test-key", OPENAI_API_KEY: "openai-test-key",
    });
    const result = await service.extractCriteria("Tìm phòng cho 4 người", null);
    assert.equal(result.guests, 4);
    assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/interactions");
    assert.equal(calls[0].options.headers["x-goog-api-key"], "gemini-test-key");
    assert.equal(calls[0].options.headers.Authorization, undefined);
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.model, "gemini-3.1-flash-lite");
    assert.equal(body.store, false);
    assert.deepEqual(Array.from(body.response_format.schema.required), [
      "city", "guests", "max_price", "amenities", "check_in", "check_out", "near_center",
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Gemini trả tiêu chí sai schema thì không được dùng để tìm phòng", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: "completed",
      steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({
        city: "Đà Lạt", guests: 1000, max_price: null, amenities: [],
        check_in: null, check_out: null, near_center: false,
      }) }] }],
    }),
  });
  try {
    const service = loadBackend("services/ai_search.service.js", { Sequelize }, {}, {
      GEMINI_API_KEY: "gemini-test-key",
    });
    await assert.rejects(service.extractCriteria("Tìm phòng", null), { status: 502 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("lời chào và hỏi khả năng không gọi AI, không làm mất tiêu chí trước đó", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error("Không được gọi AI"); };
  try {
    const service = loadBackend("services/ai_search.service.js", { Sequelize }, {}, {
      GEMINI_API_KEY: "test-key", NODE_ENV: "test",
    });
    const previous = { city: "Hà Nội", guests: null, max_price: null, amenities: [],
      check_in: null, check_out: null, near_center: false };
    const greeting = await service.search({ message: "hello", previous, ip: "127.0.0.8" });
    const help = await service.search({ message: "tôi có thể hỏi bạn những gì?", previous, ip: "127.0.0.8" });
    assert.equal(greeting.intent, "greeting");
    assert.equal(help.intent, "help");
    assert.equal(help.criteria.city, "Hà Nội");
    assert.equal(greeting.search_id, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("câu chưa có tiêu chí thì hỏi thêm thay vì trả phòng bất kỳ", async () => {
  const originalFetch = global.fetch;
  let searched = false;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: "completed",
      steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({
        city: null, guests: null, max_price: null, amenities: [],
        check_in: null, check_out: null, near_center: false,
      }) }] }],
    }),
  });
  try {
    const service = loadBackend("services/ai_search.service.js", { Sequelize }, {
      "services/listing.service.js": { list: async () => { searched = true; } },
      "utils/redis.js": { redisReady: () => false, getRedis: () => null },
    }, { GEMINI_API_KEY: "test-key", NODE_ENV: "test" });
    const result = await service.search({ message: "Tìm phòng giúp mình", ip: "127.0.0.9" });
    assert.equal(result.intent, "needs_details");
    assert.deepEqual(Array.from(result.items), []);
    assert.equal(result.search_id, null);
    assert.equal(searched, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("ngân sách thiếu đơn vị được hỏi lại và giữ thành phố cũ", async () => {
  const originalFetch = global.fetch;
  let searched = false;
  global.fetch = async () => ({ ok: true, json: async () => ({ status: "completed",
    steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({
      city: "Hà Nội", guests: null, max_price: 600, amenities: [],
      check_in: null, check_out: null, near_center: false,
    }) }] }],
  }) });
  try {
    const service = loadBackend("services/ai_search.service.js", { Sequelize }, {
      "services/listing.service.js": { list: async () => { searched = true; } },
      "utils/redis.js": { redisReady: () => false, getRedis: () => null },
    }, { GEMINI_API_KEY: "test-key", NODE_ENV: "test" });
    const result = await service.search({ message: "ngân sách tối đa dưới 600",
      previous: { city: "Hà Nội", max_price: null }, ip: "127.0.0.10" });
    assert.equal(result.intent, "clarify_budget");
    assert.equal(result.amount, 600);
    assert.equal(result.criteria.city, "Hà Nội");
    assert.equal(result.criteria.max_price, null);
    assert.equal(searched, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("đơn vị ngân sách rõ ràng được đổi thành VND mỗi đêm", () => {
  assert.equal(budgetMention("600 nghin y").amount, 600000);
  assert.equal(budgetMention("600k").amount, 600000);
  assert.equal(budgetMention("600.000d").amount, 600000);
  assert.equal(budgetMention("1,5 trieu").amount, 1500000);
  assert.equal(budgetMention("ngan sach toi da duoi 600").ambiguous, 600);
});

test("600 nghìn được áp vào bộ lọc phòng thành 600000 dù AI trả sai đơn vị", async () => {
  const originalFetch = global.fetch;
  let searchedWith;
  global.fetch = async () => ({ ok: true, json: async () => ({ status: "completed",
    steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify({
      city: "Hà Nội", guests: null, max_price: 600, amenities: [],
      check_in: null, check_out: null, near_center: false,
    }) }] }],
  }) });
  try {
    const service = loadBackend("services/ai_search.service.js", {
      Sequelize,
      Amenity: { findAll: async () => [] },
      AiSearchSession: { create: async () => {}, destroy: async () => 0 },
    }, {
      "services/listing.service.js": { list: async (filters) => {
        searchedWith = filters;
        return { items: [], meta: { total_pages: 1 } };
      } },
      "utils/redis.js": { redisReady: () => false, getRedis: () => null },
    }, { GEMINI_API_KEY: "test-key", NODE_ENV: "test" });
    const result = await service.search({ message: "600 nghìn ý",
      previous: { city: "Hà Nội", max_price: null }, ip: "127.0.0.11" });
    assert.equal(result.intent, "results");
    assert.equal(result.criteria.max_price, 600000);
    assert.equal(searchedWith.max_price, 600000);
  } finally {
    global.fetch = originalFetch;
  }
});

test("dữ liệu AI sai schema bị chặn trước khi truy vấn phòng", async () => {
  const originalFetch = global.fetch;
  let searched = false;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: "completed",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ city: "Đà Lạt", guests: 1000 }),
            },
          ],
        },
      ],
    }),
  });
  try {
    const service = loadBackend(
      "services/ai_search.service.js",
      { Sequelize },
      {
        "services/listing.service.js": {
          list: async () => {
            searched = true;
          },
        },
        "utils/redis.js": { redisReady: () => false, getRedis: () => null },
      },
      { OPENAI_API_KEY: "test-key", NODE_ENV: "test" },
    );
    await assert.rejects(
      service.search({ message: "Tìm phòng", ip: "127.0.0.2" }),
      { status: 502 },
    );
    assert.equal(searched, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("yêu cầu gần trung tâm được xếp theo tọa độ địa danh và phòng thật", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) =>
    url.includes("api.mapbox.com")
      ? {
          ok: true,
          json: async () => ({
            features: [{ text: "Đà Lạt", center: [108.44, 11.94] }],
          }),
        }
      : {
          ok: true,
          json: async () => ({
            status: "completed",
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      city: "Đà Lạt",
                      guests: null,
                      max_price: null,
                      amenities: [],
                      check_in: null,
                      check_out: null,
                      near_center: true,
                    }),
                  },
                ],
              },
            ],
          }),
        };
  try {
    const service = loadBackend(
      "services/ai_search.service.js",
      {
        Sequelize,
        AiSearchSession: { create: async () => {}, destroy: async () => 0 },
        AiSearchEvent: {},
        Booking: {},
        Amenity: { findAll: async () => [] },
        ListingAmenity: {},
      },
      {
        "services/listing.service.js": {
          list: async () => ({
            items: [
              {
                id: otherId,
                country: "Việt Nam",
                lat: 12.1,
                lng: 108.5,
                avg_rating: 5,
                price_per_night: "1000000",
              },
              {
                id: listingId,
                country: "Việt Nam",
                lat: 11.941,
                lng: 108.441,
                avg_rating: 4.5,
                price_per_night: "1000000",
              },
            ],
            meta: { total_pages: 1 },
          }),
        },
        "utils/redis.js": { redisReady: () => false, getRedis: () => null },
      },
      {
        OPENAI_API_KEY: "test-key",
        MAPBOX_ACCESS_TOKEN: "test-mapbox",
        NODE_ENV: "test",
      },
    );
    const result = await service.search({
      message: "Gần trung tâm Đà Lạt",
      ip: "127.0.0.3",
    });
    assert.equal(result.items[0].id, listingId);
    assert.equal(
      result.items[0].reasons.some((reason) => reason.type === "distance"),
      true,
    );
    assert.equal(result.unverified_near_center, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("chỉ ghi nhận booking của khách và phòng thuộc kết quả AI", async () => {
  let bookingFilter;
  let recorded;
  let selectedListing = listingId;
  const service = loadBackend(
    "services/ai_search.service.js",
    {
      Sequelize,
      Booking: {
        findOne: async ({ where }) => {
          bookingFilter = where;
          return { id: otherId, listing_id: selectedListing };
        },
      },
      AiSearchSession: {
        findByPk: async () => ({
          created_at: new Date(),
          result_ids: [listingId],
        }),
      },
      AiSearchEvent: {
        findOrCreate: async (options) => {
          recorded = options;
        },
      },
    },
    { "utils/redis.js": { redisReady: () => false, getRedis: () => null } },
  );
  await service.recordBooking(listingId, otherId, "guest-1");
  assert.equal(bookingFilter.guest_id, "guest-1");
  assert.equal(recorded.defaults.listing_id, listingId);
  selectedListing = otherId;
  await assert.rejects(service.recordBooking(listingId, otherId, "guest-1"), {
    status: 404,
  });
});

test("tỷ lệ đề xuất đếm theo phiên và chỉ tính booking đã xác nhận", async () => {
  const calls = [];
  const service = loadBackend(
    "services/ai_search.service.js",
    {
      Sequelize,
      AiSearchSession: { destroy: async () => 0, count: async () => 10 },
      AiSearchEvent: {
        count: async (options) => {
          calls.push(options);
          return options.where.event_type === "click" ? 4 : 2;
        },
      },
      Booking: {},
    },
    { "utils/redis.js": { redisReady: () => false, getRedis: () => null } },
  );
  const result = await service.metrics();
  assert.equal(result.click_rate, 0.4);
  assert.equal(result.booking_rate, 0.2);
  assert.equal(calls[0].include[0].as, "searchSession");
  assert.equal(calls[1].include[1].as, "booking");
  assert.deepEqual(
    Array.from(calls[1].include[1].where.status[Sequelize.Op.in]),
    ["confirmed", "completed"],
  );
});
