import SearchFilters from "@/components/SearchFilters";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/Pagination";
import { serverGetJson } from "@/lib/serverApi";

export default async function SearchPage({ searchParams }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  const keys = ["city","min_price","max_price","guests","bedrooms","sort","page","limit","property_type","room_type"];
  keys.forEach((k) => {
    const v = sp?.[k];
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  if (!q.has("limit")) q.set("limit", "24");
  if (!q.has("sort")) q.set("sort", "rating_desc");

  const res = await serverGetJson("/api/v1/listings?" + q.toString());
  const items = res.data?.items || [];
  const meta = res.data?.meta;

  const baseParams = { ...sp };
  delete baseParams.page;

  return (
    <div className="space-y-6">
      <SearchFilters />

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Kết quả tìm kiếm</h1>
          <p className="text-sm text-slate-600">{meta?.total ?? items.length} chỗ ở</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <ListingCard key={it.id} listing={it} />
            ))}
          </div>

          {!items.length ? (
            <div className="mt-6 rounded-2xl border bg-white p-6 text-slate-600">
              Không có kết quả. Thử đổi city hoặc điều chỉnh giá/khách.
            </div>
          ) : null}

          <Pagination meta={meta} baseParams={baseParams} />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold">Bản đồ (Sprint 2+)</div>
            <p className="mt-2 text-sm text-slate-600">
              Map sẽ làm ở Sprint 3/4 (Mapbox/Leaflet). Hiện đang placeholder để giống UI Airbnb/Booking.
            </p>
            <div className="mt-4 overflow-hidden rounded-xl bg-slate-100">
              <div className="flex h-64 items-center justify-center text-slate-500">
                Map placeholder
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
