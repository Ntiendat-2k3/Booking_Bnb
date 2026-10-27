/** Đích điều hướng chỉ là gợi ý; API trang đích luôn kiểm tra quyền truy cập. */
export function notificationTarget(notification) {
  if (notification.resource_type === "conversation" && notification.resource_id) {
    return `/messages/${encodeURIComponent(notification.resource_id)}`;
  }
  if (notification.resource_type === "booking") return "/trips";
  if (notification.resource_type === "promotion") return "/search";
  if (notification.resource_type === "host_booking") return "/host/dashboard";
  if (notification.resource_type === "host_stay" && notification.resource_id)
    return `/host/stays?listing_id=${encodeURIComponent(notification.resource_id)}`;
  if (notification.resource_type === "listing" && notification.resource_id) {
    return `/host/listings/${encodeURIComponent(notification.resource_id)}`;
  }
  if (["listing_approved", "listing_rejected"].includes(notification.type)) return "/host/listings";
  return null;
}

export function relativeNotificationTime(value, locale, justNow) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return justNow;
  const formatter = new Intl.RelativeTimeFormat(locale === "en" ? "en" : "vi", { numeric: "auto" });
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < 604800) return formatter.format(-Math.floor(seconds / 86400), "day");
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
