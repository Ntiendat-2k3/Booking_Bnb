export default function ListingCardSkeleton() {
  return (
    <div className="listing-card-skeleton relative flex min-h-80 items-end overflow-hidden rounded-panel bg-muted-surface p-5" aria-hidden="true">
      <div className="w-full space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-line" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-line" />
        <div className="flex justify-between gap-4">
          <div className="h-4 w-12 animate-pulse rounded bg-line" />
          <div className="h-4 w-28 animate-pulse rounded bg-line" />
        </div>
      </div>
    </div>
  );
}
