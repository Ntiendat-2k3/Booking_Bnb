"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import Modal from "@/components/molecules/Modal";
import ConfirmDialog from "@/components/molecules/ConfirmDialog";
import Button from "@/components/atoms/Button";
import Textarea from "@/components/atoms/Textarea";

export default function ListingActionModals({
  rejectOpen,
  setRejectOpen,
  rejectTarget,
  rejectReason,
  setRejectReason,
  reject,
  saving,
  confirm,
  setConfirm,
  approve,
}) {
  const t = useTranslations();
  return (
    <>
      <Modal
        open={rejectOpen}
        onClose={() => {
          if (!saving) setRejectOpen(false);
        }}
        title={t("listings.rejectTitle")}
        description={
          rejectTarget
            ? `#${rejectTarget.id} • ${rejectTarget.title || t("common.untitled")}`
            : ""
        }
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectOpen(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!rejectTarget) return;
                setRejectOpen(false);
                await reject(rejectTarget.id, rejectReason);
              }}
              disabled={saving}
            >
              {t("common.reject")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm ui-muted">
            {t("listings.rejectHelp")}
          </div>
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("listings.reasonPlaceholder")}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, kind: null, item: null })}
        title={t("listings.approveTitle")}
        description={
          confirm.item
            ? `#${confirm.item.id} • ${confirm.item.title || t("common.untitled")}`
            : ""
        }
        confirmText={t("common.approve")}
        loading={saving}
        onConfirm={async () => {
          const it = confirm.item;
          setConfirm({ open: false, kind: null, item: null });
          if (it) await approve(it.id);
        }}
      />
    </>
  );
}
