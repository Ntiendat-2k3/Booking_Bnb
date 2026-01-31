"use client";

export default function AmenitiesPickerCard({ grouped, picked, onToggle }) {
  return (
    <div className="p-6 bg-white border rounded-2xl">
      <div className="mb-3 text-sm font-semibold">Tiện nghi</div>
      <div className="space-y-4 max-h-[520px] overflow-auto pr-1">
        {grouped.map(([group, list]) => (
          <div key={group}>
            <div className="text-xs font-semibold text-slate-500">{group}</div>
            <div className="grid gap-2 mt-2 sm:grid-cols-2">
              {list.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm border rounded-xl cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={picked.has(a.id)}
                    onChange={() => onToggle(a.id)}
                  />
                  {a.name}
                </label>
              ))}
            </div>
          </div>
        ))}
        {!grouped?.length ? (
          <div className="text-sm text-slate-500">Chưa có danh sách tiện nghi.</div>
        ) : null}
      </div>
    </div>
  );
}
