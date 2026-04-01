import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Eye } from "lucide-react";
import { statusTone, paymentTone, money, fmtDate } from "./BookingUtils";

export default function BookingsTable({ pagedItems, filtered, openDetail }) {
  return (
    <div className="overflow-hidden border shadow-sm rounded-2xl ui-border ui-panel">
      <table className="w-full text-sm text-left">
        <thead className="bg-white/5 ui-muted">
          <tr>
            <th className="px-4 py-3">Booking</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Listing</th>
            <th className="px-4 py-3">Dates</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((b) => (
            <tr key={b.id} className="border-t ui-border hover:bg-white/5">
              <td className="px-4 py-3">
                <div className="font-mono text-xs ui-fg">#{b.id}</div>
                <div className="mt-0.5 text-xs ui-muted">
                  {fmtDate(b.created_at)}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium ui-fg">
                  {b.guest?.email || "—"}
                </div>
                <div className="mt-0.5 text-xs ui-muted font-mono">
                  UID: {b.guest?.id || "—"}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium ui-fg">
                  {b.listing?.title || "—"}
                </div>
                <div className="mt-0.5 text-xs ui-muted font-mono">
                  LID: {b.listing?.id || "—"}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="ui-fg">
                  {b.check_in || "—"} → {b.check_out || "—"}
                </div>
                <div className="mt-0.5 text-xs ui-muted">
                  {b.nights ? `${b.nights} night(s)` : ""}
                </div>
              </td>
              <td className="px-4 py-3 font-semibold">
                {money(b.total_amount)} ₫
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(b.status)}>{b.status || "—"}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <Badge tone={paymentTone(b.last_payment_status)}>
                    {b.last_payment_status || "—"}
                  </Badge>
                  <div className="text-xs ui-muted">
                    {b.last_payment_provider || ""}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDetail(b.id)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={8}>
                Không có booking.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
