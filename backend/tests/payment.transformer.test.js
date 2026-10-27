"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Sequelize = require("sequelize");
const definePayment = require("../models/payment");
const { paymentCode, paymentReferenceFromCode } = require("../transformers/payment.transformer");
const { transformBooking, transformAdminBooking } = require("../transformers/booking.transformer");

test("mã giao dịch ngắn, duy nhất và tra lại được số tham chiếu", () => {
  assert.equal(paymentCode("1"), "TXN-00000001");
  assert.equal(paymentCode("36"), "TXN-00000010");
  assert.equal(paymentCode("2821109907455"), "TXN-ZZZZZZZZ");
  assert.equal(paymentCode("2821109907456"), null);
  assert.equal(paymentReferenceFromCode(" txn-00000010 "), "36");
  assert.equal(paymentReferenceFromCode("TXN-00000000"), null);
});

test("Payment chỉ xuất mã dễ đọc, giữ UUID và mã Stripe", () => {
  const sequelize = new Sequelize("unused_test", "test", "test", { dialect: "postgres", logging: false });
  const Payment = definePayment(sequelize, Sequelize.DataTypes);
  const result = Payment.build({ id: "00000000-0000-4000-8000-000000000001",
    reference_number: "2", provider_txn_ref: "pi_test" }).toJSON();

  assert.equal(result.payment_code, "TXN-00000002");
  assert.equal(result.id, "00000000-0000-4000-8000-000000000001");
  assert.equal(result.provider_txn_ref, "pi_test");
  assert.equal(Object.hasOwn(result, "reference_number"), false);
});

test("booking của khách và Admin cùng xuất mã giao dịch từ payment lồng nhau", () => {
  const source = { reference_number: "3", payments: [{ id: "payment-uuid", reference_number: "4", status: "succeeded" }] };
  for (const result of [transformBooking(source), transformAdminBooking(source)]) {
    assert.equal(result.payments[0].id, "payment-uuid");
    assert.equal(result.payments[0].payment_code, "TXN-00000004");
    assert.equal(Object.hasOwn(result.payments[0], "reference_number"), false);
  }
});
