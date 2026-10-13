"use client";

import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";
import { useTranslations } from "@/i18n/LocaleProvider";

export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  danger = false,
  loading = false,
}) {
  const t = useTranslations();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || t("common.confirm")}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText || t("common.cancel")}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "…" : confirmText || t("common.confirm")}
          </Button>
        </>
      }
    >
    </Modal>
  );
}
