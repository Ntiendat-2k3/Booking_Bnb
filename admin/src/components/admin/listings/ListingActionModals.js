import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";

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
  return (
    <>
      <Modal
        open={rejectOpen}
        onClose={() => {
          if (!saving) setRejectOpen(false);
        }}
        title="Reject listing"
        description={
          rejectTarget
            ? `#${rejectTarget.id} • ${rejectTarget.title || "Untitled"}`
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
              Cancel
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
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm ui-muted">
            Nhập lý do để host sửa lại. (Có thể để trống nếu bạn muốn.)
          </div>
          <Textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Lý do từ chối..."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, kind: null, item: null })}
        title="Approve listing?"
        description={
          confirm.item
            ? `#${confirm.item.id} • ${confirm.item.title || "Untitled"}`
            : ""
        }
        confirmText="Approve"
        cancelText="Cancel"
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
