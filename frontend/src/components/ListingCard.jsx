"use client";

import Link from "next/link";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/store/favoritesThunks";
import { formatVND } from "@/lib/format";
import { HeartFilled, HeartOutline, StarIcon } from "./icons";
import { notifyError, notifySuccess } from "@/lib/notify";
import { selectAuthUser, selectFavoriteIdsSet } from "@/store/selectors";

export default function ListingCard({ listing }) {
  const id = listing?.id || listing?.listing_id || listing?.uuid || null;
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectAuthUser);
  const favoriteIdsSet = useSelector(selectFavoriteIdsSet);
  const isFav = id ? favoriteIdsSet.has(id) : false;

  const cover = listing.cover_url || listing.images?.[0]?.url;
  const coverSrc = cover || "https://picsum.photos/seed/airbnb/800/600";
  const rating = Number(listing.avg_rating || 0);
  const ratingText = rating > 0 ? rating.toFixed(2) : "Mới";
  const distanceKm = listing.distance_km != null ? Number(listing.distance_km) : null;
  const distanceText = Number.isFinite(distanceKm) ? `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km` : null;

  async function onToggleFav(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      notifyError("Bạn cần đăng nhập để lưu yêu thích");
      router.push("/login");
      return;
    }

    if (!id) return;

    const res = await dispatch(toggleFavorite(id));
    if (res?.ok) notifySuccess(res.favorited ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích");
    else notifyError(res?.message || "Thao tác thất bại");
  }

  return (
    <Link
      href={id ? `/rooms/${id}` : "#"}
      className="group block rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-sm hover:shadow-md transition"
    >
      <div className="relative aspect-[4/3] w-full bg-neutral-100">
        <Image
          src={coverSrc}
          alt={listing?.title || "Listing"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority={false}
        />

        <button
          type="button"
          onClick={onToggleFav}
          aria-label={isFav ? "Bỏ yêu thích" : "Thêm yêu thích"}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow hover:bg-white"
        >
          {isFav ? <HeartFilled className="h-5 w-5 text-rose-500" /> : <HeartOutline className="h-5 w-5" />}
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-neutral-900">{listing?.title || "Chỗ ở"}</div>
            <div className="mt-1 text-sm text-neutral-600 truncate">
              {listing?.city || ""}
              {listing?.country ? `, ${listing.country}` : ""}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-sm text-neutral-900">
            <StarIcon className="h-4 w-4" />
            <span>{ratingText}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-neutral-900">
            <span className="font-semibold">{formatVND(listing?.price_per_night || listing?.price || 0)}</span>
            <span className="text-neutral-600"> / đêm</span>
          </div>

          {distanceText ? <div className="text-sm text-neutral-600">{distanceText}</div> : null}
        </div>
      </div>
    </Link>
  );
}
