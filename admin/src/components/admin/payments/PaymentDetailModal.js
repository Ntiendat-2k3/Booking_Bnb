"use client";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { getStatusColor } from "./PaymentsTable";

export default function PaymentDetailModal({ detailOpen, setDetailOpen, detail }) {
  return (
    <Modal
      open={detailOpen}
      onClose={() => setDetailOpen(false)}
      title="Payment info"
      description={detail ? `Transaction ID: ${detail.transaction_id || "—"}` : ""}
      size="md"
      footer={
        <Button variant="secondary" onClick={() => setDetailOpen(false)}>
          Close
        </Button>
      }
    >
      {detail ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">ID</div>
            <div className="font-mono">{detail.id}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Booking</div>
            <div className="font-mono">{detail.booking_id ?? "—"}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Amount</div>
            <div className="font-medium text-lg text-emerald-600 dark:text-emerald-400">
              ${Number(detail.amount || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Provider</div>
            <div className="capitalize">{detail.provider || "stripe"}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Status</div>
            <Badge tone={getStatusColor(detail.status)}>{detail.status}</Badge>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold ui-muted">Created</div>
            <div>
              {detail.created_at
                ? new Date(detail.created_at).toLocaleString()
                : "—"}
            </div>
          </div>
          {detail.metadata && (
            <div className="col-span-2">
              <div className="mb-1 text-xs font-semibold ui-muted">Metadata</div>
              <pre className="p-3 text-xs overflow-auto rounded-xl bg-black/5 dark:bg-white/5 ui-muted">
                {JSON.stringify(detail.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
