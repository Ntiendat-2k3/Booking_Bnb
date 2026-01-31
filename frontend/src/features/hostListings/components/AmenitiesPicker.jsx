"use client";

export default function AmenitiesPicker({ grouped = [], picked = new Set(), onToggle }) {
  return (
    <div className="space-y-4">
      {grouped.map(([group, items]) => (
        <div key={group} className="rounded-xl border p-4">
          <div className="font-semibold mb-3">{group}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {items.map((a) => {
              const active = picked.has(a.id);
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => onToggle?.(a.id)}
                  className={[
                    "text-left rounded-lg border px-3 py-2 text-sm",
                    active ? "bg-black text-white" : "bg-white",
                  ].join(" ")}
                >
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
