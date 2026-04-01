import ListingCardSkeleton from "@/components/ListingCardSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Top filters skeleton */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm h-28 animate-pulse"></div>

      <div className="flex items-end justify-between">
        <div>
          <div className="h-6 w-40 bg-slate-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-2xl border bg-white p-5 shadow-sm h-[600px] animate-pulse"></div>
        </aside>
      </div>
    </div>
  );
}
