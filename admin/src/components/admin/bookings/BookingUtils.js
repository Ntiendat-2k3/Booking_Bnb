export function statusTone(v) {
  if (v === "confirmed") return "emerald";
  if (v === "completed") return "emerald";
  if (v === "pending_payment") return "amber";
  if (v === "cancelled") return "rose";
  return "slate";
}

export function paymentTone(v) {
  if (v === "succeeded") return "emerald";
  if (v === "pending") return "amber";
  if (v === "failed") return "rose";
  if (v === "cancelled") return "rose";
  if (v === "refunded") return "slate";
  return "slate";
}

export function money(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return String(v || "");
  return n.toLocaleString();
}

export function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}
