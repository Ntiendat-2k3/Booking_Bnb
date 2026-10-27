"use strict";

const MAX_REFERENCE_NUMBER = 36n ** 8n - 1n;

/** Biểu diễn số tham chiếu giao dịch bằng tám ký tự base36, độc lập với mã Stripe. */
function paymentCode(referenceNumber) {
  if (!/^[1-9]\d*$/.test(String(referenceNumber))) return null;
  const value = BigInt(referenceNumber);
  if (value > MAX_REFERENCE_NUMBER) return null;
  return `TXN-${value.toString(36).toUpperCase().padStart(8, "0")}`;
}

/** Tra mã giao dịch về số tham chiếu để lọc ngay trong SQL trước khi phân trang. */
function paymentReferenceFromCode(code) {
  if (typeof code !== "string" || !/^TXN-[0-9A-Z]{8}$/i.test(code.trim())) return null;
  let value = 0n;
  for (const character of code.trim().slice(4).toUpperCase())
    value = value * 36n + BigInt(parseInt(character, 36));
  return value > 0n && value <= MAX_REFERENCE_NUMBER ? value.toString() : null;
}

/** Trả mã ngắn cho API, giữ UUID và mã Stripe phục vụ thao tác nội bộ. */
function transformPayment(payment) {
  const { reference_number, ...data } = payment;
  return { ...data, payment_code: paymentCode(reference_number) };
}

module.exports = { paymentCode, paymentReferenceFromCode, transformPayment };
