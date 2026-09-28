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
