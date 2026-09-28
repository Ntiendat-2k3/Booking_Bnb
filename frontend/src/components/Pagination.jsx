import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getServerTranslator } from "@/i18n/server";

function pageHref(baseParams, page) {
  const q = new URLSearchParams();
  Object.entries(baseParams || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    q.set(k, String(v));
  });
  q.set("page", String(page));
  return "/search?" + q.toString();
}

export default async function Pagination({ meta, baseParams }) {
  if (!meta || meta.total_pages <= 1) return null;

  const { t } = await getServerTranslator();
  const page = meta.page;
  const total = meta.total_pages;

  const start = Math.max(1, page - 2);
  const end = Math.min(total, start + 4);

  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-2"
      aria-label={t("search.results")}
    >
      <Link
        href={pageHref(baseParams, Math.max(1, page - 1))}
        aria-label={t("search.previousPage")}
        aria-disabled={page <= 1}
        className={"inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-muted-surface " + (page <= 1 ? "pointer-events-none opacity-50" : "")}
      >
        <CaretLeft aria-hidden size={18} />
        <span className="sr-only sm:not-sr-only sm:ml-1">
          {t("common.previous")}
        </span>
      </Link>

      {pages.map((p) => (
        <Link
          key={p}
          href={pageHref(baseParams, p)}
          className={
            "inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition " +
            (p === page
              ? "border-brand bg-brand text-white"
              : "border-line bg-surface text-ink hover:bg-muted-surface")
          }
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Link>
      ))}

      <Link
        href={pageHref(baseParams, Math.min(total, page + 1))}
        aria-label={t("search.nextPage")}
        aria-disabled={page >= total}
        className={"inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:bg-muted-surface " + (page >= total ? "pointer-events-none opacity-50" : "")}
      >
        <span className="sr-only sm:not-sr-only sm:mr-1">
          {t("common.next")}
        </span>
        <CaretRight aria-hidden size={18} />
      </Link>
    </nav>
  );
}
