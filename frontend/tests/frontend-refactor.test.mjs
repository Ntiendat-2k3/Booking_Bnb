import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { format } from "date-fns";
import { translate } from "../src/i18n/translate.js";
import { assistantReply } from "../src/features/aiSearch/assistantReply.js";
import { listingFormValues, buildListingPayload } from "../src/features/hostListings/utils/payload.js";
import { dayEntries, visibleRange } from "../src/features/hostListings/utils/calendar.js";
import imageLoader from "../src/lib/imageLoader.js";

const { getImageProps } = createRequire(import.meta.url)("next/image");

test("Next Image tạo srcset theo sizes bằng CDN và không gọi bộ chuyển đổi ảnh Vercel", () => {
  const { props } = getImageProps({ src: "https://images.unsplash.com/photo-example?fit=crop", alt: "Room",
    fill: true, sizes: "(max-width: 640px) 90vw, 420px", loader: imageLoader });
  assert.equal(props.sizes, "(max-width: 640px) 90vw, 420px");
  assert(props.srcSet.includes("w=640"));
  assert(props.srcSet.includes("640w"));
  assert(!props.srcSet.includes("/_next/image"));
  assert(props.src.startsWith("https://images.unsplash.com/"));
});

const dictionaries = Object.fromEntries(["vn", "en"].map((locale) => [locale,
  JSON.parse(readFileSync(new URL(`../src/i18n/${locale}.json`, import.meta.url), "utf8")),
]));

test("Ảnh CDN có chiều rộng responsive, giữ tham số và không thay URL ký số/nguồn riêng tư", () => {
  const src = "https://images.unsplash.com/photo-example?fit=crop&w=1800&ixid=source-id";
  const url = new URL(imageLoader({ src, width: 640, quality: 75 }));
  assert.equal(url.searchParams.get("w"), "640");
  assert.equal(url.searchParams.get("q"), "75");
  assert.equal(url.searchParams.get("auto"), "format");
  assert.equal(url.searchParams.get("fit"), "crop");
  assert.equal(url.searchParams.get("ixid"), "source-id");
  const cloud = imageLoader({ src: "https://res.cloudinary.com/demo/image/upload/v1234567890/rooms/room.jpg", width: 640 });
  assert.equal(cloud, "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1234567890/rooms/room.jpg");
  for (const original of ["/nature-hero.webp", "/placeholder-room.svg", "data:image/png;base64,AA==",
    "https://images.unsplash.com/photo-example?s=signed", "https://res.cloudinary.com/demo/image/upload/s--signature--/v1/room.jpg",
    "https://res.cloudinary.com/demo/image/upload/v1/room.jpg?__cld_token__=signed",
    "https://res.cloudinary.com/demo/image/upload/c_fill,w_400/v1/room.jpg",
    "https://api.mapbox.com/styles/v1/static/image?access_token=fixture", "https://lh3.googleusercontent.com/avatar"] ) {
    assert.equal(imageLoader({ src: original, width: 640 }), original);
  }
});

function messageEntries(messages, prefix = "") {
  return Object.entries(messages).flatMap(([key, value]) => typeof value === "string"
    ? [[prefix + key, value]] : messageEntries(value, `${prefix}${key}.`));
}

test("Hai từ điển có cùng khóa và biến nội suy để chuyển ngôn ngữ không mất nội dung", () => {
  const vn = Object.fromEntries(messageEntries(dictionaries.vn));
  const en = Object.fromEntries(messageEntries(dictionaries.en));
  assert.deepEqual(Object.keys(vn).sort(), Object.keys(en).sort());
  const variables = (text) => [...new Set(text.match(/\{\w+\}/g) || [])].sort();
  for (const key of Object.keys(vn)) assert.deepEqual(variables(vn[key]), variables(en[key]), key);
});

test("Lời đáp AI dịch đủ ý định, số ít/nhiều, ngân sách và bước tiếp theo theo ngôn ngữ hiện tại", () => {
  const reply = { intent: "results", count: 1, criteria: { city: "Hanoi", max_price: 600000 } };
  for (const locale of ["en", "vn"]) {
    const t = (key, values) => translate(dictionaries[locale], key, values);
    for (const intent of ["greeting", "help", "clarify_budget", "needs_details"]) {
      assert.equal(assistantReply({ intent, amount: 500 }, t, locale), t(`aiSearch.reply.${intent}`, { amount: 500 }));
    }
    const text = assistantReply(reply, t, locale);
    assert(text.includes("Hanoi"));
    assert(text.includes(locale === "en" ? "600,000" : "600.000"));
    assert(text.includes(t("aiSearch.reply.dates")));
    assert(!text.includes("undefined"));
    const booked = assistantReply({ ...reply, count: 2, criteria: { check_in: "2030-10-01" } }, t, locale);
    assert(booked.includes(t("aiSearch.reply.book")));
    assert(!booked.includes("Hanoi"));
    const empty = assistantReply({ ...reply, count: 0, criteria: {} }, t, locale);
    assert.equal(empty, t("aiSearch.reply.empty", { where: "", budget: "" }));
  }
  const en = (key, values) => translate(dictionaries.en, key, values);
  assert.match(assistantReply(reply, en, "en"), /1 place in/);
  assert.match(assistantReply({ ...reply, count: 2 }, en, "en"), /2 places in/);
});

test("Form tạo/sửa phòng dùng cùng danh sách trường, giữ số 0 và không gửi dữ liệu chỉ đọc", () => {
  const empty = listingFormValues();
  assert.equal(empty.country, "");
  assert.equal(empty.cancellation_policy_code, "moderate");
  assert.equal(empty.allow_pay_at_property, false);
  const listing = Object.freeze({ id: "private-id", status: "published", title: "Room", country: "Vietnam",
    price_per_night: "100000", max_guests: 2, bedrooms: 0, beds: 0, bathrooms: 0, lat: 0, lng: 0,
    allow_pay_at_property: true, amenities: [{ id: "wifi" }] });
  const form = listingFormValues(listing);
  assert.deepEqual(Object.keys(form).sort(), Object.keys(empty).sort());
  for (const key of ["bedrooms", "beds", "bathrooms", "lat", "lng"]) assert.equal(form[key], 0);
  const payload = buildListingPayload(form);
  assert.equal(payload.price_per_night, 100000);
  assert.equal(payload.allow_pay_at_property, true);
  for (const key of ["id", "status", "amenities"]) assert.equal(key in payload, false);
  assert.equal(buildListingPayload(empty).price_per_night, null);
  assert.equal(buildListingPayload(empty).lat, null);
  assert.equal(form.price_per_night, "100000");
});

test("Lịch giữ ngày trả phòng, loại ngày cuối của khoảng khóa và ưu tiên phòng đã đặt", () => {
  const held = { id: "held", check_in: "2030-10-01", check_out: "2030-10-03", status: "pending_payment" };
  const booked = { ...held, id: "booked", status: "confirmed" };
  const block = { start_date: "2030-10-01", end_date: "2030-10-03" };
  assert.equal(dayEntries("2030-10-01", { blocks: [block] }).status, "blocked");
  assert.equal(dayEntries("2030-10-03", { blocks: [block] }).status, "available");
  assert.equal(dayEntries("2030-10-03", { bookings: [held], blocks: [block] }).status, "held");
  const result = dayEntries("2030-10-02", { bookings: [held, booked], blocks: [block] });
  assert.equal(result.status, "booked");
  assert.deepEqual(result.bookings, [held, booked]);
  assert.deepEqual(result.blocks, [block]);
  assert.equal(dayEntries("2030-10-04", { bookings: [booked] }).status, "available");
  assert.equal(dayEntries("2030-10-01", null).status, "available");
});

test("Khoảng lịch tháng/tuần/danh sách giữ tuần bắt đầu thứ Hai và mốc cuối loại trừ", () => {
  const anchor = new Date(2024, 1, 29);
  const dates = (view) => {
    const range = visibleRange(anchor, view);
    return [format(range.start, "yyyy-MM-dd"), format(range.end, "yyyy-MM-dd")];
  };
  assert.deepEqual(dates("month"), ["2024-01-29", "2024-03-04"]);
  assert.deepEqual(dates("week"), ["2024-02-26", "2024-03-04"]);
  assert.deepEqual(dates("list"), ["2024-02-01", "2024-03-01"]);
});
