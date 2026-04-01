export default function ListingCardSkeleton() {
  return (
    <div className="group block rounded-2xl overflow-hidden border border-neutral-100 bg-white shadow-sm">
      {/* Image Skeleton */}
      <div className="relative aspect-[4/3] w-full bg-neutral-200 animate-pulse"></div>
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 w-3/4 bg-neutral-200 rounded animate-pulse"></div>
            <div className="h-4 w-1/2 bg-neutral-200 rounded animate-pulse"></div>
          </div>
          <div className="h-4 w-10 bg-neutral-200 rounded animate-pulse shrink-0"></div>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="h-5 w-1/3 bg-neutral-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
