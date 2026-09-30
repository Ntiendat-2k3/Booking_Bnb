"use client";

import { useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import ListingCard from "./ListingCard";
import IconButton from "./atoms/IconButton";
import Button from "./atoms/Button";

/** Dùng cùng một bộ card cho lưới nổi bật hoặc bộ sưu tập; đổi thành phố đồng bộ cả dữ liệu và liên kết xem thêm. */
export default function SectionRow({ title, items, city, layout = "rail", collections, children }) {
  const scrollerRef = useRef(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const t = useTranslations();
  const availableCollections = collections?.filter((collection) => collection.items?.length);
  const activeCollection = availableCollections?.find((collection) => collection.titleKey === selectedKey) || availableCollections?.[0];
  const visibleItems = activeCollection?.items || items;
  const activeCity = activeCollection?.city || city;
  const viewMoreHref = activeCity
    ? `/search?${new URLSearchParams({ city: activeCity }).toString()}`
    : "/search";

  const scrollBy = (dx) => {
    const element = scrollerRef.current;
    element?.scrollBy({
      left: dx * element.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  if (!visibleItems?.length) return children || null;

  return (
    <section className="listing-section flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-[-0.04em] text-ink sm:text-3xl">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            href={viewMoreHref}
            variant="ghost" size="sm" className="shrink-0"
          >
            {t("common.seeMore")}
          </Button>
          {layout === "rail" ? <><IconButton
            onClick={() => scrollBy(-1)}
            className="hidden sm:inline-flex"
            label={t("common.previous")}
          >
            <CaretLeft aria-hidden size={18} weight="bold" />
          </IconButton>
          <IconButton
            onClick={() => scrollBy(1)}
            className="hidden sm:inline-flex"
            label={t("common.next")}
          >
            <CaretRight aria-hidden size={18} weight="bold" />
          </IconButton></> : null}
        </div>
      </div>

      {children}

      {availableCollections?.length ? (
        <nav aria-label={title} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {availableCollections.map((collection) => (
            <Button
              key={collection.titleKey}
              onClick={() => {
                setSelectedKey(collection.titleKey);
                scrollerRef.current?.scrollTo({ left: 0 });
              }}
              variant={activeCollection.titleKey === collection.titleKey ? "ink" : "secondary"}
              size="sm"
              className="shrink-0"
              aria-pressed={activeCollection.titleKey === collection.titleKey}
            >
              {t(collection.cityLabelKey)}
            </Button>
          ))}
        </nav>
      ) : null}

      <div
        ref={scrollerRef}
        className={"listing-grid " + (layout === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5" : "no-scrollbar grid auto-cols-[82%] grid-flow-col gap-4 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 sm:auto-cols-[45%] lg:auto-cols-[calc((100%-3rem)/4)]")}
      >
        {visibleItems.map((it, index) => (
          <div
            key={it?.id || it?.listing_id || it?.uuid}
            className={layout === "grid" && visibleItems.length >= 5 && index === 0 ? "min-w-0 sm:col-span-2 lg:row-span-2" : "min-w-0 snap-start"}
          >
            <ListingCard listing={it} featured={layout === "grid" && visibleItems.length >= 5 && index === 0} />
          </div>
        ))}
      </div>
    </section>
  );
}
