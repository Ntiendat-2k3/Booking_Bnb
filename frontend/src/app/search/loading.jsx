import ListingCardSkeleton from "@/components/ListingCardSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="surface-panel h-32 animate-pulse"></div>

      <div className="flex items-end justify-between">
        <div>
          <div className="h-6 w-40 bg-muted-surface rounded animate-pulse mb-2"></div>
          <div className="h-4 w-24 bg-muted-surface rounded animate-pulse"></div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="surface-panel sticky top-24 p-5 h-[600px] animate-pulse"></div>
        </aside>
      </div>
    </div>
  );
}
