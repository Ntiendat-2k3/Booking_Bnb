import Button from "@/components/atoms/Button";
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
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
      aria-label={t("search.results")}
    >
      <Button
        href={pageHref(baseParams, Math.max(1, page - 1))}
        aria-label={t("search.previousPage")}
        disabled={page <= 1}
        variant="secondary" size="sm"
      >
        <CaretLeft aria-hidden size={18} />
        <span className="sr-only sm:not-sr-only sm:ml-1">
          {t("common.previous")}
        </span>
      </Button>

      {pages.map((p) => (
        <Button
          key={p}
          href={pageHref(baseParams, p)}
          variant={p === page ? "ink" : "secondary"} size="sm" className="min-w-11 px-3"
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Button>
      ))}

      <Button
        href={pageHref(baseParams, Math.min(total, page + 1))}
        aria-label={t("search.nextPage")}
        disabled={page >= total}
        variant="secondary" size="sm"
      >
        <span className="sr-only sm:not-sr-only sm:mr-1">
          {t("common.next")}
        </span>
        <CaretRight aria-hidden size={18} />
      </Button>
    </nav>
  );
}
