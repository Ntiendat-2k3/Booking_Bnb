"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";

export default function AmenityEditModal({
  editOpen,
  setEditOpen,
  saving,
  editing,
  editForm,
  setEditForm,
  onSaveEdit,
}) {
  return (
    <Modal
      open={editOpen}
      onClose={() => {
        if (!saving) toast.success("Amenity updated");
        setEditOpen(false);
      }}
      title="Edit amenity"
      description={editing ? `ID: ${editing.id}` : ""}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setEditOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSaveEdit}
            disabled={saving || !editForm.name.trim()}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs font-semibold ui-muted">Name</div>
          <Input
            value={editForm.name}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, name: e.target.value }))
            }
            placeholder="Name"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold ui-muted">Group</div>
          <Input
            value={editForm.group}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, group: e.target.value }))
            }
            placeholder="Group (optional)"
          />
        </div>
        <label className="flex items-center gap-2 text-sm ui-muted">
          <input
            type="checkbox"
            checked={editForm.is_active === true}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, is_active: e.target.checked }))
            }
          />
          Active
        </label>
      </div>
    </Modal>
  );
}
