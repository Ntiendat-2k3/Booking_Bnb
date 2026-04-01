import { toast } from "sonner";

export function notifySuccess(text, title = "Thành công") {
  toast.success(text, { description: title !== "Thành công" ? title : undefined });
}

export function notifyInfo(text, title = "Thông tin") {
  toast.info(text, { description: title !== "Thông tin" ? title : undefined });
}

export function notifyWarning(text, title = "Cảnh báo") {
  toast.warning(text, { description: title !== "Cảnh báo" ? title : undefined });
}

export function notifyError(text, title = "Lỗi") {
  toast.error(text, { description: title !== "Lỗi" ? title : undefined });
}
