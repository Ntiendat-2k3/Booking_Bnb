"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { toast } from "sonner";

export default function AmenityCreateModal({
  createOpen,
  setCreateOpen,
  saving,
  createForm,
  setCreateForm,
  onCreate,
}) {
  return (
    <Modal
      open={createOpen}
      onClose={() => {
        if (!saving && createForm.name.trim() !== '') toast.success("Amenity created");
        setCreateOpen(false);
      }}
      title="Create amenity"
      description="Tạo tiện ích mới để host chọn khi tạo listing."
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setCreateOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onCreate}
            disabled={saving || !createForm.name.trim()}
          >
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs font-semibold ui-muted">Name</div>
          <Input
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((s) => ({ ...s, name: e.target.value }))
            }
            placeholder="Wifi, Pool, Kitchen..."
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold ui-muted">Group</div>
          <Input
            value={createForm.group}
            onChange={(e) =>
              setCreateForm((s) => ({ ...s, group: e.target.value }))
            }
            placeholder="Basic / Safety / Bedroom..."
          />
        </div>
        <label className="flex items-center gap-2 text-sm ui-muted">
          <input
            type="checkbox"
            checked={createForm.is_active === true}
            onChange={(e) =>
              setCreateForm((s) => ({ ...s, is_active: e.target.checked }))
            }
          />
          Active
        </label>
      </div>
    </Modal>
  );
}
