import { toast } from "sonner";

export function notifySuccess(text, title) {
  toast.success(text, { description: title });
}

export function notifyInfo(text, title) {
  toast.info(text, { description: title });
}

export function notifyWarning(text, title) {
  toast.warning(text, { description: title });
}

export function notifyError(text, title) {
  toast.error(text, { description: title });
}

/** Hiển thị xác nhận lâu dài; chỉ gọi thao tác khi người dùng chọn nút chính. */
export function notifyConfirm(message, { id, confirmLabel, cancelLabel, onConfirm }) {
  toast(message, {
    id,
    duration: Infinity,
    action: { label: confirmLabel, onClick: onConfirm },
    cancel: { label: cancelLabel, onClick: () => {} },
  });
}
