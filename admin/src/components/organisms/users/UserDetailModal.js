"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import UserAvatar from "@/components/atoms/UserAvatar";
import Modal from "@/components/molecules/Modal";

export default function UserDetailModal({ viewUser, setViewUser }) {
  const t = useTranslations();
  return (
    <Modal
      open={!!viewUser}
      onClose={() => setViewUser(null)}
      title={t("users.information")}
      description={viewUser ? viewUser.email : ""}
      size="md"
      footer={
        <Button variant="secondary" onClick={() => setViewUser(null)}>
          {t("common.close")}
        </Button>
      }
    >
      {viewUser ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 border ui-border">
            <div className="flex items-center gap-3">
              <UserAvatar user={viewUser} />
              <div className="text-sm font-semibold">{t("common.profile")}</div>
            </div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">{t("common.fullName")}:</span>{" "}
                {viewUser.full_name || "—"}
              </div>
              <div>
                <span className="ui-muted">{t("common.role")}:</span>{" "}
                <Badge
                  tone={
                    viewUser.role === "admin"
                      ? "zinc"
                      : viewUser.role === "host"
                        ? "emerald"
                        : "slate"
                  }
                >
                  {viewUser.role ? t(`roles.${viewUser.role}`) : "—"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 border ui-border">
            <div className="text-sm font-semibold">{t("common.identifiers")}</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">{t("common.userId")}:</span>{" "}
                <span className="font-mono text-xs">{viewUser.id}</span>
              </div>
              <div>
                <span className="ui-muted">{t("common.email")}:</span> {viewUser.email}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
