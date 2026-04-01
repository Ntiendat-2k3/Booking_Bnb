"use client";

import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

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
  return (
    <Modal
      open={!!editUser}
      onClose={() => {
        if (!saving) setEditUser(null);
      }}
      title="Edit user role"
      description={editUser ? `User: ${editUser.email}` : ""}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => setEditUser(null)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant={editRole === "admin" ? "danger" : "primary"}
            onClick={() => {
              if (editRole === "admin") setConfirmOpen(true);
              else saveRole();
            }}
            disabled={saving}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-sm ui-muted">
          Chọn role mới cho user. (Chuyển lên{" "}
          <span className="font-semibold">admin</span> sẽ mở toàn quyền quản
          trị.)
        </div>
        <Select
          value={editRole}
          onChange={(e) => setEditRole(e.target.value)}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
