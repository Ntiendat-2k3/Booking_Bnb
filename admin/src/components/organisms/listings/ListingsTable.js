"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import Image from "next/image";
import Button from "@/components/atoms/Button";
import StatusBadge from "@/components/molecules/StatusBadge";
import { Eye, CheckCircle2, XCircle, ExternalLink, CheckSquare, Square, ChevronDown } from "lucide-react";

export default function ListingsTable({
  filtered,
  pagedItems,
  saving,
  setView,
  setConfirm,
  openReject,
  selectedIds = [],
  setSelectedIds,
}) {
  const t = useTranslations();
  const frontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";

  const allVisibleIds = pagedItems.filter((x) => x.status === "pending").map((x) => x.id);
  const isAllSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(selectedIds.filter((id) => !allVisibleIds.includes(id)));
    } else {
      const next = [...new Set([...selectedIds, ...allVisibleIds])];
      setSelectedIds(next);
    }
  };

  const toggleRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (!filtered.length) {
    return (
      <div className="p-8 text-center border shadow-sm ui-border ui-panel ui-muted">
        {t("listings.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-4 py-2 border ui-border glass">
        <button
          type="button"
          onClick={toggleAll}
          disabled={!allVisibleIds.length || saving}
          className="flex items-center gap-2 text-sm font-semibold ui-fg hover:ui-accent transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAllSelected ? (
            <CheckSquare className="w-5 h-5 text-pink-500" />
          ) : (
            <Square className="w-5 h-5 ui-muted" />
          )}
          {t("common.selectPage")}
        </button>
        <div className="text-xs ui-muted">
          {t("listings.selectedItems", { count: selectedIds.length })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {pagedItems.map((x) => {
          const isSelected = selectedIds.includes(x.id);
          return (
            <div
              key={x.id}
              className={`admin-listing-row ${isSelected ? "bg-pink-500/5 border-pink-500/30" : ""}`}
            >
              <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {x.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => toggleRow(x.id)}
                      disabled={saving}
                      aria-label={t("common.selectItem", { id: x.id })}
                      aria-pressed={isSelected}
                      className="mt-1 shrink-0 lg:mt-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-pink-500" />
                      ) : (
                        <Square className="w-5 h-5 ui-muted hover:ui-fg transition" />
                      )}
                    </button>
                  ) : <span className="w-5 shrink-0" aria-hidden="true" />}

                  {x.cover_url ? <Image src={x.cover_url} alt="" width={100} height={58} unoptimized className="admin-listing-image" /> : <span className="admin-listing-image" aria-hidden="true" />}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold truncate ui-fg">
                        {x.title || t("common.untitled")}
                      </div>
                      <StatusBadge status={x.status} />
                      <span className="font-mono text-xs ui-muted">#{x.id}</span>
                    </div>

                    <div className="mt-1 text-sm ui-muted">
                      {x.city ? <span>{x.city}</span> : null}
                      {x.city ? <span> • </span> : null}
                      <span className="ui-muted">
                        {t("common.host")}: {x.host?.full_name || "—"} ({x.host?.email || "—"})
                      </span>
                    </div>

                    {x.reject_reason ? (
                      <div className="admin-danger-note px-3 py-2 mt-2 text-sm">
                        <span className="font-semibold">{t("listings.rejectReason")}:</span>{" "}
                        {x.reject_reason}
                      </div>
                    ) : null}
                    {x.status === "draft" ? (
                      <p className="mt-2 text-xs ui-muted">{t("listings.draftAwaitingSubmission")}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pl-9 md:pl-0 md:justify-end md:shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setView(x)}
                  >
                    <Eye className="w-4 h-4" />
                    {t("common.view")}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      window.open(`${frontendUrl}/rooms/${x.id}`, "_blank")
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("common.page")}
                  </Button>

                  {x.status === "pending" ? (
                    <details
                      name="listing-actions"
                      className="admin-listing-actions relative"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          event.currentTarget.open = false;
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.currentTarget.open = false;
                          event.currentTarget.querySelector("summary")?.focus();
                        }
                      }}
                    >
                      <summary
                        aria-disabled={saving}
                        onClick={(event) => {
                          if (saving) event.preventDefault();
                        }}
                        className={`btn-secondary inline-flex h-9 items-center justify-center gap-2 border px-3 text-sm font-semibold ${saving ? "opacity-60" : ""}`}
                      >
                        {t("common.actions")}
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      </summary>
                      <div className="absolute right-0 top-full z-50 mt-1 flex w-36 flex-col gap-1 border ui-border ui-panel p-1 shadow-lg">
                        <Button
                          variant="success"
                          size="sm"
                          className="w-full justify-start"
                          onClick={(event) => {
                            event.currentTarget.closest("details").open = false;
                            setConfirm({ open: true, kind: "approve", item: x });
                          }}
                          disabled={saving}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {t("common.approve")}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="w-full justify-start"
                          onClick={(event) => {
                            event.currentTarget.closest("details").open = false;
                            openReject(x);
                          }}
                          disabled={saving}
                        >
                          <XCircle className="w-4 h-4" />
                          {t("common.reject")}
                        </Button>
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
