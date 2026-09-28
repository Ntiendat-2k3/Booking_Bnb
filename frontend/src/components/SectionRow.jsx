"use client";

import { useRef } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import ListingCard from "./ListingCard";

export default function SectionRow({ title, items, city }) {
  const scrollerRef = useRef(null);
  const t = useTranslations();
  const viewMoreHref = city
    ? `/search?${new URLSearchParams({ city }).toString()}`
    : "/search";

  const scrollBy = (dx) => {
    scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  if (!items?.length) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href={viewMoreHref}
            className="mr-1 text-sm font-semibold text-ink transition hover:text-brand hover:underline"
          >
            {t("common.seeMore")}
          </Link>
          <button
            type="button"
            onClick={() => scrollBy(-900)}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-muted-surface sm:inline-flex"
            aria-label={t("common.previous")}
          >
            <CaretLeft aria-hidden size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(900)}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:bg-muted-surface sm:inline-flex"
            aria-label={t("common.next")}
          >
            <CaretRight aria-hidden size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((it, idx) => (
          <div
            key={it?.id || it?.listing_id || it?.uuid}
            className="w-[275px] shrink-0 snap-start sm:w-[292px]"
          >
            <ListingCard listing={it} priority={idx < 4} />
          </div>
        ))}
      </div>
    </section>
  );
}
