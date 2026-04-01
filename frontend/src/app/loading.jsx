import Container from "@/components/layout/Container";
import ListingCardSkeleton from "@/components/ListingCardSkeleton";

export default function Loading() {
  return (
    <div className="space-y-10">
      {/* 2 skeleton sections for the homepage */}
      {[1, 2].map((section) => (
        <section key={section} className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="h-7 w-64 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-5 w-20 bg-slate-200 rounded animate-pulse"></div>
          </div>
          
          <div className="flex gap-6 overflow-hidden pb-2">
            {[1, 2, 3, 4, 5].map((card) => (
              <div key={card} className="shrink-0 w-[260px] sm:w-[280px]">
                <ListingCardSkeleton />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
