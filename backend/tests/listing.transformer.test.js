"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Sequelize = require("sequelize");
const { listingCode, listingReferenceFromCode } = require("../transformers/listing.transformer");
const defineListing = require("../models/listing");

test("mã phòng duy nhất theo số tham chiếu và có thể tìm lại chính xác", () => {
  assert.equal(listingCode("1"), "ROOM-00000001");
  assert.equal(listingCode("36"), "ROOM-00000010");
  assert.equal(listingCode("2821109907455"), "ROOM-ZZZZZZZZ");
  assert.equal(listingCode("2821109907456"), null);
  assert.equal(listingReferenceFromCode(" room-00000010 "), "36");
  assert.equal(listingReferenceFromCode("ROOM-00000000"), null);
  assert.equal(listingReferenceFromCode("ROOM-INVALID"), null);
});

test("Listing trả mã ngắn và giữ UUID cho các thao tác", () => {
  const sequelize = new Sequelize("unused_test", "test", "test", { dialect: "postgres", logging: false });
  const Listing = defineListing(sequelize, Sequelize.DataTypes);
  const id = "00000000-0000-4000-8000-000000000001";
  const listing = Listing.build({ id, reference_number: "2", title: "Phòng thử nghiệm" });
  const result = listing.toJSON();

  assert.equal(result.id, id);
  assert.equal(result.listing_code, "ROOM-00000002");
  assert.equal(Object.hasOwn(result, "reference_number"), false);
});
