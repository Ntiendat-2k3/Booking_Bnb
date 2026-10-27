"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadBackend } = require("./helpers");
const { bookingCode, transformBooking, transformAdminBooking } = require("../transformers/booking.transformer");

test("booking trả mã phòng trong listing lồng nhau và giữ UUID cho liên kết", () => {
  const Sequelize = require("sequelize");
  const sequelize = new Sequelize("unused_test", "test", "test", { dialect: "postgres", logging: false });
  const Listing = require("../models/listing")(sequelize, Sequelize.DataTypes);
  const Booking = require("../models/booking")(sequelize, Sequelize.DataTypes);
  Booking.belongsTo(Listing, { as: "listing", foreignKey: "listing_id" });
  const booking = Booking.build({ reference_number: "2", listing: {
    id: "00000000-0000-4000-8000-000000000001", reference_number: "36", title: "Phòng thử",
  } }, { include: [{ model: Listing, as: "listing" }] });

  const result = transformBooking(booking);
  assert.equal(result.booking_code, "BNB-00000002");
  assert.equal(result.listing.id, "00000000-0000-4000-8000-000000000001");
  assert.equal(result.listing.listing_code, "ROOM-00000010");
  assert.equal(Object.hasOwn(result.listing, "reference_number"), false);
});

test("Admin nhận mã booking và phòng, giữ UUID và khách nhưng không lộ số tham chiếu", () => {
  const booking = {
    id: "booking-uuid", reference_number: "36", guest: { email: "guest@example.com" },
    listing: { id: "room-uuid", reference_number: "2", title: "Phòng thử" },
  };
  const result = transformAdminBooking({ toJSON: () => booking });

  assert.equal(result.id, "booking-uuid");
  assert.equal(result.booking_code, "BNB-00000010");
  assert.equal(result.guest.email, "guest@example.com");
  assert.equal(result.listing.id, "room-uuid");
  assert.equal(result.listing.listing_code, "ROOM-00000002");
  assert.equal(Object.hasOwn(result, "reference_number"), false);
  assert.equal(Object.hasOwn(result.listing, "reference_number"), false);
});

test("mã BnB có đúng tám ký tự, duy nhất theo số tham chiếu và giữ ID gốc", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const firstCode = bookingCode("1");

  assert.equal(firstCode, "BNB-00000001");
  assert.equal(bookingCode("36"), "BNB-00000010");
  assert.notEqual(bookingCode("2"), firstCode);
  assert.equal(bookingCode("2821109907455"), "BNB-ZZZZZZZZ");
  assert.equal(bookingCode("2821109907456"), null);
  assert.equal(bookingCode("not-a-number"), null);

  const booking = { id, reference_number: "1", status: "confirmed", check_out: "2026-10-20", review: null };
  const result = transformBooking(booking);
  assert.equal(result.id, id);
  assert.equal(result.booking_code, firstCode);
  assert.equal(result.can_review, true);
  assert.equal(booking.booking_code, undefined);
  assert.equal(Object.hasOwn(result, "reference_number"), false);
});

test("transformer giữ dữ liệu booking không có review và nhận Sequelize model", () => {
  const id = "00000000-0000-4000-8000-000000000003";
  const result = transformBooking({ toJSON: () => ({
    id,
    reference_number: "2",
    status: "pending_payment",
    guest: { full_name: "Tên tài khoản", phone: "0900000000", avatar_url: "avatar.jpg" },
    bookingProposal: { renter_name: "Tên người thuê", renter_phone: "0911111111" },
  }) });
  assert.equal(result.booking_code, "BNB-00000002");
  assert.equal(Object.hasOwn(result, "can_review"), false);
  assert.deepEqual(result.renter, { name: "Tên người thuê", phone: "0911111111", avatar_url: null });
  assert.equal(Object.hasOwn(result, "guest"), false);
  assert.equal(Object.hasOwn(result, "bookingProposal"), false);
});

test("Trip dùng liên hệ đã lưu trong booking thay vì hồ sơ khách hiện tại", () => {
  const result = transformBooking({ toJSON: () => ({
    id: "booking-direct", reference_number: "4", renter_name: "Tên khi đặt",
    renter_phone: "0912345678", guest: { full_name: "Tên hồ sơ mới", phone: "0999999999" },
  }) });
  assert.deepEqual(result.renter, { name: "Tên khi đặt", phone: "0912345678", avatar_url: null });
});

test("API danh sách và chi tiết cùng trả mã thương hiệu, giữ UUID làm định danh", async () => {
  const id = "00000000-0000-4000-8000-000000000004";
  const booking = { toJSON: () => ({ id, reference_number: "3", status: "confirmed", check_out: "2026-10-20", review: null }) };
  const service = {
    myBookings: async () => ({ items: [booking], meta: { total: 1 } }),
    detail: async () => booking,
  };
  const controller = loadBackend("controllers/api/v1/booking.controller.js", {}, {
    "services/booking.service.js": service,
  });
  const request = { user: { user: { id: "user-id" } }, query: {}, params: { id } };
  let payload;
  const response = {
    status() { return this; },
    json(value) { payload = value; return this; },
  };
  const fail = (error) => { throw error; };

  await controller.myBookings(request, response, fail);
  assert.equal(payload.data.items[0].booking_code, "BNB-00000003");
  assert.equal(payload.data.items[0].id, id);
  await controller.detail(request, response, fail);
  assert.equal(payload.data.booking.booking_code, "BNB-00000003");
  assert.equal(payload.data.booking.can_review, true);
});
