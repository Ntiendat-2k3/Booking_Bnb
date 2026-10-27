"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin, MapTrifold, Star } from "@phosphor-icons/react";
import clsx from "clsx";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import FavoriteButton from "@/components/FavoriteButton";

export default function ListingCard({ listing, priority = false, checkIn, checkOut, featured = false, mapSelectable = false, mapHighlighted = false, onMapHover, onMapSelect }) {
  const id = listing?.id || listing?.listing_id || listing?.uuid || null;
  const dates = new URLSearchParams({ ...(checkIn ? { check_in: checkIn } : {}), ...(checkOut ? { check_out: checkOut } : {}) });
  const roomHref = id ? `/rooms/${id}${dates.size ? `?${dates}` : ""}` : "#";
  const { locale, t } = useLocale();

  const cover = listing.cover_url || listing.images?.[0]?.url;
  const coverSrc = cover || "/placeholder-room.svg";
  const rating = Number(listing.avg_rating || 0);
  const ratingText = rating > 0 ? rating.toFixed(1) : t("common.new");
  const distanceKm = listing.distance_km != null ? Number(listing.distance_km) : null;
  const distanceText = Number.isFinite(distanceKm) ? `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km` : null;
  const Action = mapSelectable ? "div" : Link;
  const actionProps = mapSelectable
    ? {
      role: "button",
      tabIndex: 0,
      onClick: () => onMapSelect?.(id),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onMapSelect?.(id);
        }
      },
      "aria-label": `${t("search.viewOnMap")}: ${listing?.title || t("listing.fallbackTitle")}`,
    }
    : { href: roomHref };

  return (
    <article
      className={clsx("discovery-card listing-card group flex h-full flex-col", mapHighlighted && "border-brand shadow-soft ring-2 ring-brand/30")}
      onPointerEnter={mapSelectable ? () => onMapHover?.(id) : undefined}
      onPointerLeave={mapSelectable ? () => onMapHover?.(null) : undefined}
      onFocusCapture={mapSelectable ? () => onMapHover?.(id) : undefined}
      onBlurCapture={mapSelectable ? (event) => { if (!event.currentTarget.contains(event.relatedTarget)) onMapHover?.(null); } : undefined}
    >
      <div className={clsx("listing-card-cover relative aspect-[4/3] w-full overflow-hidden rounded-control bg-muted-surface", featured && "sm:aspect-[16/9] lg:aspect-auto lg:min-h-80 lg:flex-1")}>
        <Action {...actionProps} className="absolute inset-0 w-full text-left">
          <Image
            src={coverSrc}
            alt={listing?.title || t("listing.fallbackTitle")}
            fill
            sizes={featured ? "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 680px" : "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 420px"}
            className="object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
            priority={priority}
          />
        </Action>

        <FavoriteButton listingId={id} className="card-favorite absolute right-3 top-3 z-10 shadow-sm" />
      </div>

      <Action {...actionProps} className={clsx("listing-card-content flex w-full flex-1 flex-col px-3 pb-3 pt-4 text-left", featured && "lg:flex-none")}>
        <div className="listing-card-meta mb-3 flex items-center justify-between gap-3">
          <p className="listing-card-location truncate text-sm text-muted-ink">
            <MapPin aria-hidden size={16} className="mr-1 hidden shrink-0" />
            {listing?.city || ""}{listing?.country ? `, ${listing.country}` : ""}
          </p>
          <span className="listing-card-rating inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
            <Star aria-hidden size={16} weight="fill" className="text-brand" />{ratingText}
            {Number(listing.review_count) > 0 && <span className="hidden font-normal">({listing.review_count})</span>}
          </span>
        </div>
        <h3 className={clsx("listing-card-title line-clamp-2 min-h-12 text-lg font-bold leading-6 tracking-tight text-ink", featured && "lg:min-h-0 lg:text-3xl lg:leading-tight")}>
          {listing?.title || t("listing.fallbackTitle")}
        </h3>

        {distanceText ? <p className="mt-2 text-sm text-muted-ink">{t("listing.distance", { distance: distanceText })}</p> : null}
        <div className="listing-card-price mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-3">
            <div className="text-sm text-ink">
              <span className="block text-lg font-bold tracking-tight">
                {formatVND(
                  listing?.stay_price_total || listing?.price_per_night || listing?.price || 0,
                  locale === "en" ? "en-US" : "vi-VN",
                )}
              </span>
              <span className="text-xs text-muted-ink">{listing?.stay_nights
                ? t("pricing.forStay", { count: listing.stay_nights }) : t("listing.perNight")}</span>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-muted-surface text-ink transition group-hover:bg-ink group-hover:text-on-ink">
              {mapSelectable ? <MapTrifold aria-hidden size={20} /> : <ArrowUpRight aria-hidden size={20} />}
            </span>
          </div>
        </div>
      </Action>
      {mapSelectable ? (
        <Link href={roomHref} className="mx-3 mb-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-muted-surface focus-visible:ring-2 focus-visible:ring-brand/30">
          {t("common.viewDetails")}<ArrowUpRight aria-hidden size={18} />
        </Link>
      ) : null}
    </article>
  );
}
