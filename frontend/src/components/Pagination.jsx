import Link from "next/link";

function pageHref(baseParams, page) {
  const q = new URLSearchParams();
  Object.entries(baseParams || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  q.set("page", String(page));
  return "/search?" + q.toString();
}

export default function Pagination({ meta, baseParams }) {
  if (!meta || meta.total_pages <= 1) return null;

  const page = meta.page;
  const total = meta.total_pages;

  const start = Math.max(1, page - 2);
  const end = Math.min(total, start + 4);

  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <Link
        href={pageHref(baseParams, Math.max(1, page - 1))}
        className={"rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 " + (page <= 1 ? "pointer-events-none opacity-50" : "")}
      >
        Trước
      </Link>

      {pages.map((p) => (
        <Link
          key={p}
          href={pageHref(baseParams, p)}
          className={
            "rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 " +
            (p === page ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-900" : "")
          }
        >
          {p}
        </Link>
      ))}

      <Link
        href={pageHref(baseParams, Math.min(total, page + 1))}
        className={"rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 " + (page >= total ? "pointer-events-none opacity-50" : "")}
      >
        Sau
      </Link>
    </div>
  );
}
