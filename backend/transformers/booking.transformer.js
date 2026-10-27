"use strict";

const { transformListing } = require("./listing.transformer");
const { transformPayment } = require("./payment.transformer");

const MAX_REFERENCE_NUMBER = 36n ** 8n - 1n;

/** Số tham chiếu duy nhất từ database được biểu diễn bằng đúng tám ký tự base36. */
function bookingCode(referenceNumber) {
  if (!/^[1-9]\d*$/.test(String(referenceNumber))) return null;
  const value = BigInt(referenceNumber);
  if (value > MAX_REFERENCE_NUMBER) return null;
  return `BNB-${value.toString(36).toUpperCase().padStart(8, "0")}`;
}

/** Tra mã BNB về số tham chiếu mà không mất độ chính xác khi tìm booking cho Host. */
function bookingReferenceFromCode(code) {
  if (typeof code !== "string" || !/^BNB-[0-9A-Z]{8}$/i.test(code.trim())) return null;
  let value = 0n;
  for (const character of code.trim().slice(4).toUpperCase())
    value = value * 36n + BigInt(parseInt(character, 36));
  return value > 0n && value <= MAX_REFERENCE_NUMBER ? value.toString() : null;
}

/** Chuyển booking từ Sequelize sang dữ liệu API; ID gốc vẫn dùng cho thao tác và phân quyền. */
function transformBooking(booking) {
  const plain = typeof booking.toJSON === "function" ? booking.toJSON() : { ...booking };
  const { reference_number, guest, bookingProposal, ...bookingData } = plain;
  const result = { ...bookingData, booking_code: bookingCode(reference_number) };

  if (bookingData.listing) result.listing = transformListing(bookingData.listing);
  if (bookingData.payments) result.payments = bookingData.payments.map(transformPayment);

  if (bookingData.renter_name || bookingData.renter_phone || bookingProposal) {
    result.renter = {
      name: bookingProposal?.renter_name || bookingData.renter_name || null,
      phone: bookingProposal?.renter_phone || bookingData.renter_phone || null,
      avatar_url: bookingProposal?.renter_name ? null : guest?.avatar_url || null,
    };
  }

  if (Object.hasOwn(plain, "review")) {
    result.can_review = !plain.review &&
      ["confirmed", "completed"].includes(plain.status) &&
      String(plain.check_out) <= new Date().toISOString().slice(0, 10);
  }

  return result;
}

/** Giữ thông tin quản trị của booking và thay số tham chiếu nội bộ bằng mã dễ đọc. */
function transformAdminBooking(booking) {
  const plain = typeof booking.toJSON === "function" ? booking.toJSON() : { ...booking };
  const { reference_number, ...data } = plain;
  return {
    ...data,
    booking_code: bookingCode(reference_number),
    ...(data.listing ? { listing: transformListing(data.listing) } : {}),
    ...(data.payments ? { payments: data.payments.map(transformPayment) } : {}),
  };
}

module.exports = { bookingCode, bookingReferenceFromCode, transformBooking, transformAdminBooking };
