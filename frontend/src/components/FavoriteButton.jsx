"use client";

import { Heart } from "@phosphor-icons/react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/store/favoritesThunks";
import { selectAuthUser, selectFavoriteIdsSet } from "@/store/selectors";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import IconButton from "@/components/atoms/IconButton";

/** Card và trang chi tiết dùng cùng thao tác yêu thích; chờ khởi tạo phiên trước khi gửi yêu cầu. */
export default function FavoriteButton({ listingId, className, variant }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useTranslations();
  const user = useSelector(selectAuthUser);
  const isInitialized = useSelector((s) => s.auth.isInitialized);
  const favoriteIdsSet = useSelector(selectFavoriteIdsSet);
  const isFav = listingId ? favoriteIdsSet.has(listingId) : false;

  async function onToggleFav() {
    if (!isInitialized || !listingId) return;
    if (!user) {
      notifyError(t("listing.favoriteLogin"));
      router.push("/login");
      return;
    }
    const res = await dispatch(toggleFavorite(listingId));
    if (res?.ok) {
      notifySuccess(t(res.favorited ? "listing.favoriteAdded" : "listing.favoriteRemoved"));
    } else {
      notifyError(res?.message || t("listing.favoriteFailed"));
    }
  }

  return (
    <IconButton onClick={onToggleFav} disabled={!isInitialized} variant={variant}
      label={t(isFav ? "listing.favoriteRemove" : "listing.favoriteAdd")}
      aria-pressed={isFav} className={className}>
      <Heart aria-hidden size={21} weight={isFav ? "fill" : "regular"} className={isFav ? "text-pink-500" : undefined} />
    </IconButton>
  );
}
