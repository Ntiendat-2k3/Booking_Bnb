"use strict";

const MAX_REFERENCE_NUMBER = 36n ** 8n - 1n;

/** Biểu diễn số tham chiếu duy nhất của phòng bằng tám ký tự base36. */
function listingCode(referenceNumber) {
  if (!/^[1-9]\d*$/.test(String(referenceNumber))) return null;
  const value = BigInt(referenceNumber);
  if (value > MAX_REFERENCE_NUMBER) return null;
  return `ROOM-${value.toString(36).toUpperCase().padStart(8, "0")}`;
}

/** Đổi mã phòng về số tham chiếu để tìm kiếm mà không làm tròn BIGINT. */
function listingReferenceFromCode(code) {
  if (typeof code !== "string" || !/^ROOM-[0-9A-Z]{8}$/i.test(code.trim())) return null;
  let value = 0n;
  for (const character of code.trim().slice(5).toUpperCase())
    value = value * 36n + BigInt(parseInt(character, 36));
  return value > 0n && value <= MAX_REFERENCE_NUMBER ? value.toString() : null;
}

/** Chỉ xuất mã dễ đọc qua API; UUID vẫn là định danh dùng cho thao tác. */
function transformListing(listing) {
  const { reference_number, ...data } = listing;
  return { ...data, listing_code: listingCode(reference_number) };
}

module.exports = { listingCode, listingReferenceFromCode, transformListing };
