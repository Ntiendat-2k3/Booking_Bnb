"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Select from "@/components/atoms/Select";
import Modal from "@/components/molecules/Modal";

const ROLE_OPTIONS = ["guest", "host", "admin"];

export default function UserRoleModal({
  editUser,
  setEditUser,
  editRole,
  setEditRole,
  saving,
  setConfirmOpen,
  saveRole,
}) {
  const t = useTranslations();
  return (
    <Modal
      open={!!editUser}
      onClose={() => {
        if (!saving) setEditUser(null);
      }}
      title={t("users.editRole")}
      description={editUser ? `${t("common.user")}: ${editUser.email}` : ""}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setEditUser(null)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant={editRole === "admin" ? "danger" : "primary"}
            onClick={() => {
              if (editRole === "admin") setConfirmOpen(true);
              else saveRole();
            }}
            disabled={saving}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-sm ui-muted">
          {t("users.editRoleDescription")}
        </div>
        <Select
          value={editRole}
          onChange={(e) => setEditRole(e.target.value)}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
