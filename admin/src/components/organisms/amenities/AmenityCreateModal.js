"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Modal from "@/components/molecules/Modal";

export default function AmenityCreateModal({
  createOpen,
  setCreateOpen,
  saving,
  createForm,
  setCreateForm,
  onCreate,
}) {
  const t = useTranslations();
  return (
    <Modal
      open={createOpen}
      onClose={() => {
        if (!saving) setCreateOpen(false);
      }}
      title={t("amenities.createTitle")}
      description={t("amenities.createDescription")}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setCreateOpen(false)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={onCreate}
            disabled={saving || !createForm.name.trim()}
          >
            {t("common.create")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs font-semibold ui-muted">{t("common.name")}</div>
          <Input
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((s) => ({ ...s, name: e.target.value }))
            }
            placeholder={t("amenities.nameExample")}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold ui-muted">{t("common.group")}</div>
          <Input
            value={createForm.group}
            onChange={(e) =>
              setCreateForm((s) => ({ ...s, group: e.target.value }))
            }
            placeholder={t("amenities.groupExample")}
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
          {t("common.active")}
        </label>
      </div>
    </Modal>
  );
}
