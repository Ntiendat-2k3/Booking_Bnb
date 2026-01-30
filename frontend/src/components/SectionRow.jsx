"use client";

import ListingCard from "./ListingCard";

export default function SectionRow({ title, items }) {
  if (!items?.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {items.map((it) => (
          <ListingCard key={it.id} listing={it} />
        ))}
      </div>
    </section>
  );
}
