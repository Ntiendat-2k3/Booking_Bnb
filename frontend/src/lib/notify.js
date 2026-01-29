const base = {
  effect: "fade",
  speed: 250,
  showIcon: true,
  showCloseButton: true,
  autoclose: true,
  autotimeout: 2000,
  notificationsGap: 16,
  notificationsPadding: 16,
  position: "right top",
  type: "outline",
};

const show = async (text, title, status, customOpts = {}) => {
  // Kiểm tra nếu không phải môi trường browser thì dừng lại ngay
  if (typeof window === "undefined") return;

  // Dynamic Import: Chỉ tải thư viện khi hàm này được gọi
  const Notify = (await import("simple-notify")).default;

  new Notify({
    ...base,
    status,
    title,
    text,
    ...customOpts,
  });
};

export function notifySuccess(text, title = "Thành công") {
  show(text, title, "success");
}

export function notifyInfo(text, title = "Thông tin") {
  show(text, title, "info");
}

export function notifyWarning(text, title = "Cảnh báo") {
  show(text, title, "warning");
}

export function notifyError(text, title = "Lỗi") {
  // Error thường cần hiển thị lâu hơn chút
  show(text, title, "error", { autotimeout: 2600 });
}
