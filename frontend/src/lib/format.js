export function formatVND(value) {
  try {
    return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " ₫";
  } catch {
    return value + " ₫";
  }
}
