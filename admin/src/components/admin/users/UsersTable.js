"use client";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Eye, Pencil } from "lucide-react";

export default function UsersTable({ pagedItems, filtered, setViewUser, openEdit }) {
  return (
    <div className="overflow-hidden border shadow-sm rounded-2xl ui-border ui-panel">
      <table className="w-full text-sm">
        <thead className="text-left bg-white/5 ui-muted">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Full name</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((u) => (
            <tr key={u.id} className="border-t ui-border hover:bg-white/5">
              <td className="px-4 py-3">
                <div className="font-medium ui-fg">{u.email}</div>
                <div className="mt-0.5 text-xs ui-muted font-mono">
                  ID: {u.id}
                </div>
              </td>
              <td className="px-4 py-3">
                {u.full_name || <span className="ui-muted-2">—</span>}
              </td>
              <td className="px-4 py-3">
                <Badge
                  tone={
                    u.role === "admin"
                      ? "zinc"
                      : u.role === "host"
                        ? "emerald"
                        : "slate"
                  }
                >
                  {u.role || "—"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setViewUser(u)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openEdit(u)}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit role
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={4}>
                Không có user.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
