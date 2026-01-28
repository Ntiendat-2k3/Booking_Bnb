"use client";

import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/store/favoritesThunks";
import { formatVND } from "@/lib/format";
import { HeartFilled, HeartOutline, StarIcon } from "./icons";
import { notifyError, notifySuccess } from "@/lib/notify";

export default function ListingCard({ listing }) {
  const id = listing?.id || listing?.listing_id || listing?.uuid || null;
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const favoriteIds = useSelector((s) => s.favorites.ids || []);
  const isFav = id ? favoriteIds.includes(id) : false;

  const cover = listing.cover_url || listing.images?.[0]?.url;
  const rating = Number(listing.avg_rating || 0);
  const ratingText = rating > 0 ? rating.toFixed(2) : "Mới";

  async function onToggleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
    if (id) await dispatch(toggleFavorite(id));
  }

  return (
    <Link href={id ? `/rooms/${id}` : "#"} className={"group block " + (!id ? "pointer-events-none opacity-60" : "")}>
      <div className="relative overflow-hidden rounded-2xl bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover || "https://picsum.photos/seed/placeholder/1200/800"}
          alt={listing.title}
          className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />

        <button
          type="button"
          onClick={onToggleFav}
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow hover:bg-white"
          aria-label="Yêu thích"
          title={user ? "Lưu vào danh sách yêu thích" : "Đăng nhập để lưu"}
        >
          {isFav ? <HeartFilled className="h-5 w-5 text-rose-500" /> : <HeartOutline className="h-5 w-5 text-slate-800" />}
        </button>
      </div>

      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {listing.city}, {listing.country}
          </div>
          <div className="truncate text-sm text-slate-600">{listing.title}</div>
          <div className="mt-1 text-sm">
            <span className="font-semibold">{formatVND(listing.price_per_night)}</span>
            <span className="text-slate-600"> / đêm</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 text-sm">
          <StarIcon className="h-4 w-4 text-slate-900" />
          <span>{ratingText}</span>
        </div>
      </div>
    </Link>
  );
}
