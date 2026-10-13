"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import UserAvatar from "@/components/atoms/UserAvatar";
import DateTimeCell from "@/components/atoms/DateTimeCell";
import CopyId from "@/components/molecules/CopyId";
import { Eye, EyeOff, Trash2, CheckSquare, Square } from "lucide-react";

function Stars({ rating }) {
  const n = Math.max(0, Math.min(5, Number(rating || 0)));
  return (
    <div className="text-sm">
      <span className="text-[var(--admin-gold)]">{"★★★★★".slice(0, n)}</span>
      <span className="text-zinc-300">{"★★★★★".slice(0, 5 - n)}</span>
      <span className="ml-2 text-xs ui-muted">{n}/5</span>
    </div>
  );
}

export default function ReviewsTable({
  pagedItems,
  filtered,
  setView,
  unhideReview,
  hideReview,
  setConfirm,
  busyId,
  selectedIds = [],
  setSelectedIds,
}) {
  const t = useTranslations();
  const { locale } = useLocale();
  const allVisibleIds = pagedItems.map(r => r.id);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.includes(id));

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(selectedIds.filter(id => !allVisibleIds.includes(id)));
    } else {
      setSelectedIds([...new Set([...selectedIds, ...allVisibleIds])]);
    }
  };

  const toggleRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="overflow-x-auto border ui-border ui-panel">
      <table className="admin-review-table w-full text-left text-[13px]">
        <colgroup>
          <col className="w-[4%]" /><col className="w-[24%]" /><col className="w-[19%]" />
          <col className="w-[20%]" /><col className="w-[9%]" /><col className="w-[10%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr>
            <th className="px-2">
              <button type="button" onClick={toggleAll} aria-label={t("common.selectPage")} aria-pressed={isAllSelected} className="flex items-center">
                {isAllSelected ? (
                  <CheckSquare className="w-5 h-5 text-pink-500" />
                ) : (
                  <Square className="w-5 h-5 ui-muted" />
                )}
              </button>
            </th>
            <th className="px-2">{t("common.review")}</th>
            <th className="px-2">{t("common.listing")}</th>
            <th className="px-2">{t("common.user")}</th>
            <th className="px-2">{t("common.visibility")}</th>
            <th className="px-2">{t("common.created")}</th>
            <th className="px-2 text-right">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((r) => {
            const isSelected = selectedIds.includes(r.id);
            return (
              <tr
                key={r.id}
                className={[
                  "border-t ui-border hover:bg-white/5 transition-colors",
                  isSelected ? "bg-pink-500/5 hover:bg-pink-500/10" : ""
                ].join(" ")}
              >
                <td className="px-2">
                  <button type="button" onClick={() => toggleRow(r.id)} aria-label={t("common.selectItem", { id: r.id })} aria-pressed={isSelected} className="flex items-center">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-pink-500" />
                    ) : (
                      <Square className="w-5 h-5 ui-muted hover:ui-fg transition" />
                    )}
                  </button>
                </td>
                <td className="px-2">
                  <div className="truncate font-medium ui-fg" title={r.comment || ""}>{r.comment || "—"}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars rating={r.rating} />
                    <CopyId value={r.id} prefix="#" />
                  </div>
                </td>
                <td className="px-2">
                  <div className="truncate font-medium ui-fg" title={r.listing?.title || ""}>
                    {r.listing?.title || "—"}
                  </div>
                  <CopyId value={r.listing?.id} />
                </td>
                <td className="px-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserAvatar user={r.reviewer} />
                    <div className="min-w-0">
                      <div className="truncate font-medium ui-fg" title={r.reviewer?.full_name || r.reviewer?.email}>{r.reviewer?.full_name || r.reviewer?.email || "—"}</div>
                      <div className="mt-0.5 truncate text-xs ui-muted" title={r.reviewer?.email}>{r.reviewer?.email || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2">
                  <Badge tone={r.is_hidden ? "rose" : "emerald"}>
                    {t(r.is_hidden ? "statuses.hidden" : "statuses.visible")}
                  </Badge>
                </td>
                <td className="px-2"><DateTimeCell value={r.created_at} locale={locale} /></td>
                <td className="px-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-9 px-0"
                      onClick={() => setView(r)}
                      aria-label={t("common.view")}
                      title={t("common.view")}
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </Button>

                    {r.is_hidden ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-9 px-0"
                        onClick={() => unhideReview(r.id)}
                        disabled={busyId === r.id}
                        aria-label={t("common.unhide")}
                        title={t("common.unhide")}
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-9 px-0"
                        onClick={() => hideReview(r.id)}
                        disabled={busyId === r.id}
                        aria-label={t("common.hide")}
                        title={t("common.hide")}
                      >
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      size="sm"
                      className="w-9 px-0"
                      onClick={() =>
                        setConfirm({ open: true, kind: "delete", item: r })
                      }
                      disabled={busyId === r.id}
                      aria-label={t("common.delete")}
                      title={t("common.delete")}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={7}>
                {t("reviews.empty")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export { Stars };
