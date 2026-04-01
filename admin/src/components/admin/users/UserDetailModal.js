"use client";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function UserDetailModal({ viewUser, setViewUser }) {
  return (
    <Modal
      open={!!viewUser}
      onClose={() => setViewUser(null)}
      title="User information"
      description={viewUser ? viewUser.email : ""}
      size="md"
      footer={
        <Button variant="secondary" onClick={() => setViewUser(null)}>
          Close
        </Button>
      }
    >
      {viewUser ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-2xl ui-border">
            <div className="text-sm font-semibold">Profile</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">Full name:</span>{" "}
                {viewUser.full_name || "—"}
              </div>
              <div>
                <span className="ui-muted">Role:</span>{" "}
                <Badge
                  tone={
                    viewUser.role === "admin"
                      ? "zinc"
                      : viewUser.role === "host"
                        ? "emerald"
                        : "slate"
                  }
                >
                  {viewUser.role || "—"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-2xl ui-border">
            <div className="text-sm font-semibold">Identifiers</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">User ID:</span>{" "}
                <span className="font-mono text-xs">{viewUser.id}</span>
              </div>
              <div>
                <span className="ui-muted">Email:</span> {viewUser.email}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
