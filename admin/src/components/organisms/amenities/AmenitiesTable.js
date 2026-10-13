"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import { Pencil, EyeOff, Eye } from "lucide-react";

export default function AmenitiesTable({ pagedItems, filtered, openEdit, setConfirm, saving }) {
  const t = useTranslations();
  return (
    <div className="overflow-hidden border shadow-sm ui-border ui-panel">
      <table className="w-full text-sm text-left">
        <thead className="bg-white/5 ui-muted">
          <tr>
            <th className="px-4 py-3">{t("common.name")}</th>
            <th className="px-4 py-3">{t("common.group")}</th>
            <th className="px-4 py-3">{t("common.slug")}</th>
            <th className="px-4 py-3">{t("common.used")}</th>
            <th className="px-4 py-3">{t("common.status")}</th>
            <th className="px-4 py-3 text-right">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((a) => (
            <tr key={a.id} className="border-t ui-border hover:bg-white/5">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="admin-amenity-icon" aria-hidden="true">{a.name?.charAt(0).toUpperCase()}</span>
                  <div>
                    <div className="font-medium ui-fg">{a.name}</div>
                    <div className="mt-0.5 text-xs font-mono ui-muted">ID: {a.id}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {a.group || <span className="ui-muted-2">—</span>}
              </td>
              <td className="px-4 py-3 font-mono text-xs ui-muted">
                {a.slug}
              </td>
              <td className="px-4 py-3">{a.listing_count ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={a.is_active !== false ? "emerald" : "zinc"}>
                  {t(a.is_active !== false ? "common.active" : "common.inactive")}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil className="w-4 h-4" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirm({ open: true, item: a })}
                    disabled={saving}
                  >
                    {a.is_active !== false ? (
                      <>
                        <EyeOff className="w-4 h-4" /> {t("common.deactivate")}
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" /> {t("common.activate")}
                      </>
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}

          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={6}>
                {t("amenities.empty")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
