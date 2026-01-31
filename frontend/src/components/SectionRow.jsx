"use client";

import { useMemo, useRef } from "react";
import ListingCard from "./ListingCard";

export default function SectionRow({ title, items, city }) {
  if (!items?.length) return null;

  const scrollerRef = useRef(null);

  const viewMoreHref = useMemo(() => {
    if (!city) return "/search";
    const q = new URLSearchParams({ city });
    return `/search?${q.toString()}`;
  }, [city]);

  const scrollBy = (dx) => {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <a
            href={viewMoreHref}
            className="text-sm font-medium text-gray-700 hover:underline"
          >
            Xem thêm
          </a>
          <button
            type="button"
            onClick={() => scrollBy(-900)}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white hover:bg-gray-50"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(900)}
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white hover:bg-gray-50"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      {/* Carousel: horizontal scroll on all sizes; buttons (sm+) just help navigate */}
      <div
        ref={scrollerRef}
        className="flex gap-6 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((it) => (
          <div
            key={it?.id || it?.listing_id || it?.uuid}
            className="shrink-0 snap-start w-[260px] sm:w-[280px]"
          >
            <ListingCard listing={it} />
          </div>
        ))}
      </div>
    </section>
  );
}
