const crypto = require("crypto");

/**
 * VNPay checksum rules (PAY):
 * - Remove vnp_SecureHash & vnp_SecureHashType before hashing
 * - Sort params by key (ascending)
 * - Build querystring key=value joined by '&' using URL encoding
 * - HMACSHA512 with vnp_HashSecret
 */

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
        sorted[key] = obj[key];
      }
    });
  return sorted;
}

function encode(value) {
  // VNPay samples use encodeURIComponent then replace spaces with '+'
  return encodeURIComponent(String(value)).replace(/%20/g, "+");
}

function buildQuery(params) {
  const sorted = sortObject(params);
  return Object.keys(sorted)
    .map((k) => `${encode(k)}=${encode(sorted[k])}`)
    .join("&");
}

function signParams(params, hashSecret) {
  const qs = buildQuery(params);
  return crypto.createHmac("sha512", hashSecret).update(qs, "utf-8").digest("hex");
}

function verifyReturn(query, hashSecret) {
  const input = { ...query };
  const secureHash = input.vnp_SecureHash;
  delete input.vnp_SecureHash;
  delete input.vnp_SecureHashType;

  const expected = signParams(input, hashSecret);
  return {
    ok: secureHash && expected && secureHash.toLowerCase() === expected.toLowerCase(),
    expected,
    received: secureHash,
  };
}

module.exports = {
  sortObject,
  buildQuery,
  signParams,
  verifyReturn,
};
