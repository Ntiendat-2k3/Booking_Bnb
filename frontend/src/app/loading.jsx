import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import { SECTION_CONFIG } from "@/lib/constants";

export default function Loading() {
  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-2" aria-hidden="true"><div className="h-64 rounded-feature bg-muted-surface animate-pulse" /><div className="h-80 rounded-feature bg-muted-surface animate-pulse" /></div>
      <div className="h-28 rounded-panel bg-muted-surface animate-pulse" aria-hidden="true" />
      {[1, 2].map((section) => (
        <section key={section} className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="h-7 w-48 bg-muted-surface rounded animate-pulse"></div>
            <div className="h-5 w-20 bg-muted-surface rounded animate-pulse"></div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: section === 1 ? SECTION_CONFIG[0].limit : 4 }, (_, card) => (
              <div key={card} className="min-w-0">
                <ListingCardSkeleton />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
