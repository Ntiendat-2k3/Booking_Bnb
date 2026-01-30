"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function ConfirmDialog({
  open,
  onClose,
  title = "Confirm",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  danger = false,
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "..." : confirmText}
          </Button>
        </>
      }
    >
      {/* Empty body on purpose (description is enough) */}
    </Modal>
  );
}
