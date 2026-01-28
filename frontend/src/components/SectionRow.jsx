"use client";

import ListingCard from "./ListingCard";

export default function SectionRow({ title, items }) {
  if (!items?.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => (
          <div key={it.id} className="w-[280px] shrink-0">
            <ListingCard listing={it} />
          </div>
        ))}
      </div>
    </section>
  );
}
