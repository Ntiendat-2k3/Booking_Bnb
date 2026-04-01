import Button from "@/components/ui/Button";
import StatusBadge from "./StatusBadge";
import { Eye, CheckCircle2, XCircle, ExternalLink, CheckSquare, Square } from "lucide-react";

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
  const frontendUrl =
    process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3001";

  const allVisibleIds = pagedItems.map((x) => x.id);
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
      <div className="p-8 text-center border shadow-sm rounded-2xl ui-border ui-panel ui-muted">
        Không có items.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header / Bulk Toggle */}
      <div className="flex items-center gap-3 px-4 py-2 border ui-border glass rounded-2xl">
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 text-sm font-semibold ui-fg hover:ui-accent transition"
        >
          {isAllSelected ? (
            <CheckSquare className="w-5 h-5 text-pink-500" />
          ) : (
            <Square className="w-5 h-5 ui-muted" />
          )}
          Select All on Page
        </button>
        <div className="text-xs ui-muted">
          {selectedIds.length} items selected
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {pagedItems.map((x) => {
          const isSelected = selectedIds.includes(x.id);
          return (
            <div
              key={x.id}
              className={[
                "relative p-4 border shadow-sm rounded-2xl ui-border transition-all duration-200",
                isSelected
                  ? "bg-pink-500/5 border-pink-500/30 ring-1 ring-pink-500/20"
                  : "ui-panel",
              ].join(" ")}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4 min-w-0">
                  <button
                    onClick={() => toggleRow(x.id)}
                    className="mt-1 shrink-0 lg:mt-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-pink-500" />
                    ) : (
                      <Square className="w-5 h-5 ui-muted hover:ui-fg transition" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold truncate ui-fg">
                        {x.title || "Untitled"}
                      </div>
                      <StatusBadge status={x.status} />
                      <span className="font-mono text-xs ui-muted">#{x.id}</span>
                    </div>

                    <div className="mt-1 text-sm ui-muted">
                      {x.city ? <span>{x.city}</span> : null}
                      {x.city ? <span> • </span> : null}
                      <span className="ui-muted">
                        Host: {x.host?.full_name || "—"} ({x.host?.email || "—"})
                      </span>
                    </div>

                    {x.reject_reason ? (
                      <div className="px-3 py-2 mt-2 text-sm rounded-xl bg-rose-50 text-rose-700">
                        <span className="font-semibold">Reject reason:</span>{" "}
                        {x.reject_reason}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pl-9 md:pl-0 md:justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setView(x)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      window.open(`${frontendUrl}/rooms/${x.id}`, "_blank")
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                    Page
                  </Button>

                  {x.status === "pending" ? (
                    <>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() =>
                          setConfirm({ open: true, kind: "approve", item: x })
                        }
                        disabled={saving}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => openReject(x)}
                        disabled={saving}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </>
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
