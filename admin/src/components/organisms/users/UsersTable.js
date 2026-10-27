"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import UserAvatar from "@/components/atoms/UserAvatar";
import DateTimeCell from "@/components/atoms/DateTimeCell";
import CopyId from "@/components/molecules/CopyId";
import { Eye, Pencil } from "lucide-react";

export default function UsersTable({ pagedItems, filtered, setViewUser, openEdit }) {
  const t = useTranslations();
  const { locale } = useLocale();
  return (
    <div className="overflow-hidden border shadow-sm ui-border ui-panel">
      <table className="w-full text-sm">
        <thead className="text-left bg-white/5 ui-muted">
          <tr>
            <th className="px-4 py-3">{t("common.email")}</th>
            <th className="px-4 py-3">{t("common.fullName")}</th>
            <th className="px-4 py-3">{t("common.role")}</th>
            <th className="px-4 py-3">{t("ui.accountStatus")}</th>
            <th className="px-4 py-3">{t("ui.joined")}</th>
            <th className="px-4 py-3 text-right">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((u) => (
            <tr key={u.id} className="border-t ui-border hover:bg-white/5">
              <td className="px-4 py-3">
                <div className="font-medium ui-fg">{u.email}</div>
                <CopyId value={u.id} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={u} />
                  <span className="min-w-0 truncate" title={u.full_name || ""}>{u.full_name || "—"}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge
                  tone={
                    u.role === "admin"
                      ? "zinc"
                      : u.role === "host"
                        ? "emerald"
                        : "slate"
                  }
                >
                  {u.role ? t(`roles.${u.role}`) : "—"}
                </Badge>
              </td>
              <td className="px-4 py-3"><Badge tone={u.status === "blocked" ? "rose" : u.status === "pending_verification" ? "amber" : "emerald"} className="whitespace-nowrap px-2 py-0.5">{t(`statuses.${u.status || "active"}`)}</Badge></td>
              <td className="px-4 py-3"><DateTimeCell value={u.created_at} locale={locale} /></td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setViewUser(u)}
                  >
                    <Eye className="w-4 h-4" />
                    {t("common.view")}
                  </Button>
                  {u.status !== "pending_verification" ? <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openEdit(u)}
                  >
                    <Pencil className="w-4 h-4" />
                    {t("users.editRole")}
                  </Button> : null}
                </div>
              </td>
            </tr>
          ))}
          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={6}>
                {t("users.empty")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
