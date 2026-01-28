"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
  { key: "Căn hộ", label: "Căn hộ" },
  { key: "Nhà", label: "Nhà" },
  { key: "Khách sạn", label: "Khách sạn" },
  { key: "Villa", label: "Villa" },
  { key: "Hanok", label: "Hanok" },
  { key: "Nhà khách", label: "Nhà khách" },
  { key: "Phòng", label: "Phòng" },
];

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "shrink-0 rounded-full border px-4 py-2 text-sm transition " +
        (active ? "border-slate-900 bg-slate-900 text-white" : "bg-white hover:bg-slate-50")
      }
    >
      {children}
    </button>
  );
}

export default function CategoryTabs() {
  const router = useRouter();  const params = useSearchParams();

  const current = params.get("property_type") || "";

  function go(value) {
    // categories drive search page
    const q = new URLSearchParams(params.toString());
    if (value) q.set("property_type", value);
    else q.delete("property_type");
    q.delete("page");
    router.push("/search?" + q.toString());
  }

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex gap-2 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={!current} onClick={() => go("")}>Tất cả</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.key} active={current === c.key} onClick={() => go(c.key)}>
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
