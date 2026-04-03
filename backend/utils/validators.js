/**
 * Shared validation & parsing helpers.
 * Import these instead of re-declaring in every controller/service.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true when `v` is a valid UUID v1–v5 string.
 */
function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v);
}

/**
 * Safely parse a value to integer.
 * Returns `fallback` (default null) when the value is empty or not finite.
 */
function toInt(v, fallback = null) {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/**
 * Safely parse a value to float.
 * Returns `null` when the value is empty or not finite.
 */
function toFloat(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pick only allowed keys from an object.
 * Returns a new object containing only the keys present in `keys`.
 */
function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

module.exports = { isUuid, toInt, toFloat, pick };
