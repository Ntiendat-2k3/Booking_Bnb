"use client";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Plus, Pencil, EyeOff, Eye } from "lucide-react";

export default function AmenitiesTable({ pagedItems, filtered, openEdit, setConfirm, saving }) {
  return (
    <div className="overflow-hidden border shadow-sm rounded-2xl ui-border ui-panel">
      <table className="w-full text-sm text-left">
        <thead className="bg-white/5 ui-muted">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Group</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Used</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((a) => (
            <tr key={a.id} className="border-t ui-border hover:bg-white/5">
              <td className="px-4 py-3">
                <div className="font-medium ui-fg">{a.name}</div>
                <div className="mt-0.5 text-xs font-mono ui-muted">
                  ID: {a.id}
                </div>
              </td>
              <td className="px-4 py-3">
                {a.group || <span className="ui-muted-2">—</span>}
              </td>
              <td className="px-4 py-3 font-mono text-xs ui-muted">
                {a.slug}
              </td>
              <td className="px-4 py-3">{a.listing_count ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={a.is_active !== false ? "emerald" : "zinc"}>
                  {a.is_active !== false ? "active" : "inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirm({ open: true, item: a })}
                    disabled={saving}
                  >
                    {a.is_active !== false ? (
                      <>
                        <EyeOff className="w-4 h-4" /> Deactivate
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" /> Activate
                      </>
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}

          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={6}>
                Không có amenity.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
