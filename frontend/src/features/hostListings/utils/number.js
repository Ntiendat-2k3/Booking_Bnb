export function numOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function intOrNull(v) {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}
