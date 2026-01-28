import Notify from "simple-notify";

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

export function notifySuccess(text, title = "Thành công") {
  return new Notify({ ...base, status: "success", title, text });
}

export function notifyInfo(text, title = "Thông tin") {
  return new Notify({ ...base, status: "info", title, text });
}

export function notifyWarning(text, title = "Cảnh báo") {
  return new Notify({ ...base, status: "warning", title, text });
}

export function notifyError(text, title = "Lỗi") {
  return new Notify({
    ...base,
    status: "error",
    title,
    text,
    autotimeout: 2600,
  });
}
