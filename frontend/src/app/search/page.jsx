import { MapTrifold } from "@phosphor-icons/react/dist/ssr";
import SearchFilters from "@/components/Search/SearchFilters";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/Pagination";
import SearchResultsMap from "@/components/Search/SearchResultsMap";
import EmptyState from "@/components/molecules/EmptyState";
import { serverGetJson } from "@/lib/serverApi";
import { buildSearchMetadata } from "@/lib/seo";
import { SEARCH_PARAM_KEYS } from "@/lib/constants";
import { getServerTranslator } from "@/i18n/server";

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  return buildSearchMetadata(sp, await getServerTranslator());
}

export default async function SearchPage({ searchParams }) {
  const sp = await searchParams;
  const { t } = await getServerTranslator();
  const q = new URLSearchParams();
  SEARCH_PARAM_KEYS.forEach((k) => {
    const v = sp?.[k];
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  if (!q.has("limit")) q.set("limit", "24");
  if (!q.has("sort")) q.set("sort", "rating_desc");

  let res;
  try { res = await serverGetJson("/api/v1/listings?" + q.toString()); } catch {
    return <div role="alert" className="space-y-6"><SearchFilters /><EmptyState title={t("common.loadFailed")} description={t("search.loadError")} /><a href={`/search?${q}`} className="inline-flex min-h-11 items-center rounded-xl border border-line px-4">{t("common.retry")}</a></div>;
  }
  const items = res.data?.items || [];
  const meta = res.data?.meta;

  const baseParams = { ...sp };
  delete baseParams.page;

  return (
    <div className="space-y-8">
      <SearchFilters />

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-ink">
            {t("search.results")}
          </h1>
          <p className="mt-1 text-sm text-muted-ink">
            {t("search.resultCount", { count: meta?.total ?? items.length })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((it) => (
              <ListingCard key={it.id} listing={it} />
            ))}
          </div>

          {!items.length ? (
            <EmptyState
              className="mt-6"
              icon={<MapTrifold aria-hidden size={30} />}
              title={t("search.emptyTitle")}
              description={t("search.emptyDescription")}
            />
          ) : null}

          <Pagination meta={meta} baseParams={baseParams} />
        </div>

        <aside className="block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-sm">
            <div className="flex items-center gap-2 px-2 pb-3 text-sm font-semibold text-ink">
              <MapTrifold aria-hidden size={18} />
              {t("search.map")}
            </div>
            <div className="mt-4 overflow-hidden rounded-xl bg-slate-100">
              <SearchResultsMap
                items={items}
                userLat={sp?.lat}
                userLng={sp?.lng}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
