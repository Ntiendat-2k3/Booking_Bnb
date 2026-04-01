"use client";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Eye, CreditCard } from "lucide-react";

export function getStatusColor(st) {
  switch (st) {
    case "completed":
    case "success":
      return "emerald";
    case "failed":
      return "rose";
    case "refunded":
      return "amber";
    case "pending":
    default:
      return "zinc";
  }
}

export default function PaymentsTable({ pagedItems, filtered, openDetail }) {
  return (
    <div className="overflow-hidden border shadow-sm rounded-2xl ui-border ui-panel">
      <table className="w-full text-sm text-left">
        <thead className="bg-white/5 ui-muted">
          <tr>
            <th className="px-4 py-3">Txnn / Booking</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Provider</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((p) => (
            <tr key={p.id} className="border-t ui-border hover:bg-white/5">
              <td className="px-4 py-3">
                <div className="font-mono text-xs ui-muted">#{p.id}</div>
                <div className="mt-0.5 text-xs font-mono ui-muted">
                  bk: {p.booking_id ?? "—"}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium ui-fg w-40 truncate">
                  {p.user?.email || "—"}
                </div>
                <div className="mt-0.5 font-mono text-xs ui-muted">
                  ID: {p.user?.id || "—"}
                </div>
              </td>
              <td className="px-4 py-3 capitalize">
                {p.provider || "stripe"}
              </td>
              <td className="px-4 py-3 font-medium">
                ${Number(p.amount || 0).toFixed(2)}
              </td>
              <td className="px-4 py-3 capitalize">
                <Badge tone={getStatusColor(p.status)}>{p.status}</Badge>
              </td>
              <td className="px-4 py-3">
                {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDetail(p)}
                  >
                    <Eye className="w-4 h-4" />
                    Detail
                  </Button>
                </div>
              </td>
            </tr>
          ))}

          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={7}>
                Không có giao dịch nào.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
