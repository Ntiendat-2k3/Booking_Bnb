export function formatVND(value, locale = "vi-VN") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    return value + " ₫";
  }
}
