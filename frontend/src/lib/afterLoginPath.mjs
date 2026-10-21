/** Giữ ưu tiên phê duyệt QR và chỉ cho phép đường dẫn chat nội bộ sau đăng nhập. */
export function afterLoginPath() {
  const code = window.sessionStorage.getItem("booking-qr-approval");
  if (code) return "/auth/qr/approve";
  const next = window.sessionStorage.getItem("booking-chat-next");
  return next && /^\/messages\?listing=[0-9a-f-]{36}$/i.test(next) ? next : "/profile";
}
