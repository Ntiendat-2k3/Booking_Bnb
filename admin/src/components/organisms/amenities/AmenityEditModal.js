"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Modal from "@/components/molecules/Modal";

export default function AmenityEditModal({
  editOpen,
  setEditOpen,
  saving,
  editing,
  editForm,
  setEditForm,
  onSaveEdit,
}) {
  const t = useTranslations();
  return (
    <Modal
      open={editOpen}
      onClose={() => {
        if (!saving) setEditOpen(false);
      }}
      title={t("amenities.editTitle")}
      description={editing ? `ID: ${editing.id}` : ""}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setEditOpen(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={onSaveEdit}
            disabled={saving || !editForm.name.trim()}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs font-semibold ui-muted">{t("common.name")}</div>
          <Input
            value={editForm.name}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, name: e.target.value }))
            }
            placeholder={t("common.name")}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold ui-muted">{t("common.group")}</div>
          <Input
            value={editForm.group}
            onChange={(e) =>
              setEditForm((s) => ({ ...s, group: e.target.value }))
            }
            placeholder={t("amenities.groupPlaceholder")}
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
          {t("common.active")}
        </label>
      </div>
    </Modal>
  );
}
