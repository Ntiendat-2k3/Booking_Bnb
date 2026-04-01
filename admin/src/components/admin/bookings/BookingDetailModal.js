import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { statusTone, paymentTone, money, fmtDate } from "./BookingUtils";

export default function BookingDetailModal({ detailOpen, setDetailOpen, detail, detailLoading }) {
  return (
    <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Booking detail"
        description={detail?.id ? `#${detail.id}` : ""}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetailOpen(false)}>
            Close
          </Button>
        }
      >
        {detailLoading ? (
          <div className="py-8 text-sm ui-muted">Loading...</div>
        ) : detail ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-2xl ui-border ui-panel-2">
              <div className="text-sm font-semibold">Info</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">Status:</span>{" "}
                  <Badge tone={statusTone(detail.status)}>
                    {detail.status}
                  </Badge>
                </div>
                <div>
                  <span className="ui-muted">Check-in:</span>{" "}
                  {detail.check_in || "—"}
                </div>
                <div>
                  <span className="ui-muted">Check-out:</span>{" "}
                  {detail.check_out || "—"}
                </div>
                <div>
                  <span className="ui-muted">Total:</span>{" "}
                  <span className="font-semibold">
                    {money(detail.total_amount)} ₫
                  </span>
                </div>
                <div>
                  <span className="ui-muted">Created:</span>{" "}
                  {fmtDate(detail.created_at)}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border ui-panel-2">
              <div className="text-sm font-semibold">User / Listing</div>
              <div className="mt-2 space-y-1 text-sm ui-fg">
                <div>
                  <span className="ui-muted">User:</span>{" "}
                  {detail.guest?.email || "—"}{" "}
                  <span className="font-mono text-xs ui-muted-2">
                    ({detail.guest?.id || "—"})
                  </span>
                </div>
                <div>
                  <span className="ui-muted">Listing:</span>{" "}
                  {detail.listing?.title || "—"}{" "}
                  <span className="font-mono text-xs ui-muted">
                    ({detail.listing?.id || "—"})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border ui-panel-2 md:col-span-2">
              <div className="text-sm font-semibold">Payments</div>
              <div className="mt-3 overflow-hidden border rounded-xl ui-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 ui-muted">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Provider</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.payments || []).map((p) => (
                      <tr key={p.id} className="border-t ui-border">
                        <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                        <td className="px-3 py-2">{p.provider || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge tone={paymentTone(p.status)}>
                            {p.status || "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{money(p.amount)} ₫</td>
                        <td className="px-3 py-2">{fmtDate(p.created_at)}</td>
                      </tr>
                    ))}
                    {!(detail.payments || []).length ? (
                      <tr>
                        <td className="px-3 py-6 ui-muted" colSpan={5}>
                          No payments.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border rounded-2xl ui-border ui-panel-2 md:col-span-2">
              <div className="text-sm font-semibold">Review</div>
              {detail.review ? (
                <div className="p-4 mt-2 text-sm rounded-xl bg-white/5 ui-fg">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {detail.review.rating}★
                    </span>
                    <span className="ui-muted">•</span>
                    <span className="text-xs ui-muted">
                      {fmtDate(detail.review.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap ui-muted">
                    {detail.review.comment || "—"}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm ui-muted">No review.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-sm ui-muted">No data.</div>
        )}
      </Modal>
  );
}
