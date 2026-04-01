"use client";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Stars, fmtDate } from "./ReviewsTable";

export default function ReviewDetailModal({ view, setView }) {
  return (
    <Modal
      open={!!view}
      onClose={() => setView(null)}
      title="Review detail"
      description={view ? `#${view.id}` : ""}
      size="lg"
      footer={
        <Button variant="secondary" onClick={() => setView(null)}>
          Close
        </Button>
      }
    >
      {view ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-2xl ui-border">
            <div className="text-sm font-semibold">Meta</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">Rating:</span>{" "}
                <Stars rating={view.rating} />
              </div>
              <div>
                <span className="ui-muted">Visibility:</span>{" "}
                <Badge tone={view.is_hidden ? "rose" : "emerald"}>
                  {view.is_hidden ? "hidden" : "visible"}
                </Badge>
              </div>
              <div>
                <span className="ui-muted">Created:</span>{" "}
                {fmtDate(view.created_at)}
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-2xl ui-border">
            <div className="text-sm font-semibold">User / Listing</div>
            <div className="mt-2 space-y-1 text-sm ui-fg">
              <div>
                <span className="ui-muted">User:</span>{" "}
                {view.user?.email || "—"}{" "}
                <span className="font-mono text-xs ui-muted">
                  ({view.user?.id || "—"})
                </span>
              </div>
              <div>
                <span className="ui-muted">Listing:</span>{" "}
                {view.listing?.title || "—"}{" "}
                <span className="font-mono text-xs ui-muted">
                  ({view.listing?.id || "—"})
                </span>
              </div>
              <div>
                <span className="ui-muted">Booking:</span>{" "}
                <span className="font-mono text-xs">
                  {view.booking_id ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-2xl ui-border md:col-span-2">
            <div className="text-sm font-semibold">Comment</div>
            <div className="p-4 mt-2 text-sm whitespace-pre-wrap rounded-xl bg-white/5 ui-muted">
              {view.comment || "—"}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
