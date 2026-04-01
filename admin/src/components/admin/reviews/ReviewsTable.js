import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Eye, EyeOff, Trash2, CheckSquare, Square } from "lucide-react";

function Stars({ rating }) {
  const n = Math.max(0, Math.min(5, Number(rating || 0)));
  return (
    <div className="text-sm">
      <span className="ui-fg">{"★★★★★".slice(0, n)}</span>
      <span className="text-zinc-300">{"★★★★★".slice(0, 5 - n)}</span>
      <span className="ml-2 text-xs ui-muted">{n}/5</span>
    </div>
  );
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
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
    <div className="overflow-hidden border shadow-sm rounded-2xl ui-border ui-panel">
      <table className="w-full text-sm text-left">
        <thead className="bg-white/5 ui-muted">
          <tr>
            <th className="px-4 py-3 w-10">
              <button onClick={toggleAll} className="flex items-center">
                {isAllSelected ? (
                  <CheckSquare className="w-5 h-5 text-pink-500" />
                ) : (
                  <Square className="w-5 h-5 ui-muted" />
                )}
              </button>
            </th>
            <th className="px-4 py-3">Review</th>
            <th className="px-4 py-3">Listing</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Visibility</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
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
                <td className="px-4 py-3">
                  <button onClick={() => toggleRow(r.id)} className="flex items-center">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-pink-500" />
                    ) : (
                      <Square className="w-5 h-5 ui-muted hover:ui-fg transition" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs ui-muted">#{r.id}</div>
                  <div className="mt-0.5 text-xs ui-muted font-mono">
                    booking: {r.booking_id ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium ui-fg">
                    {r.listing?.title || "—"}
                  </div>
                  <div className="mt-0.5 text-xs ui-muted font-mono">
                    LID: {r.listing?.id || "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium ui-fg">
                    {r.user?.email || "—"}
                  </div>
                  <div className="mt-0.5 text-xs ui-muted font-mono">
                    UID: {r.user?.id || "—"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Stars rating={r.rating} />
                </td>
                <td className="px-4 py-3">
                  <Badge tone={r.is_hidden ? "rose" : "emerald"}>
                    {r.is_hidden ? "hidden" : "visible"}
                  </Badge>
                </td>
                <td className="px-4 py-3">{fmtDate(r.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setView(r)}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>

                    {r.is_hidden ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => unhideReview(r.id)}
                        disabled={busyId === r.id}
                      >
                        <Eye className="w-4 h-4" />
                        Unhide
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => hideReview(r.id)}
                        disabled={busyId === r.id}
                      >
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setConfirm({ open: true, kind: "delete", item: r })
                      }
                      disabled={busyId === r.id}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={8}>
                Không có review.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export { Stars, fmtDate };
