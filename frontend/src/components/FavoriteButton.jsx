"use client";

import { useMemo, useState } from "react";
import { Heart } from "@phosphor-icons/react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/store/favoritesThunks";
import { selectAuthUser, selectIsFavorite } from "@/store/selectors";
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
  const favoriteSelector = useMemo(() => selectIsFavorite(listingId), [listingId]);
  const isFav = useSelector(favoriteSelector);
  const [optimistic, setOptimistic] = useState(null);
  const pending = optimistic !== null && optimistic.listingId === listingId && optimistic.userId === user?.id;
  const pressed = pending ? optimistic.favorited : isFav;

  async function onToggleFav() {
    if (!isInitialized || !listingId || pending) return;
    if (!user) {
      notifyError(t("listing.favoriteLogin"));
      router.push("/login");
      return;
    }
    // Chỉ dự đoán trạng thái hiển thị của đúng phòng/phiên; Redux vẫn do kết quả API quyết định.
    const update = { listingId, userId: user.id, favorited: !isFav };
    setOptimistic(update);
    try {
      const res = await dispatch(toggleFavorite(listingId));
      if (res?.ok) {
        notifySuccess(t(res.favorited ? "listing.favoriteAdded" : "listing.favoriteRemoved"));
      } else {
        notifyError(res?.message || t("listing.favoriteFailed"));
      }
    } finally {
      setOptimistic((current) => current === update ? null : current);
    }
  }

  return (
    <IconButton onClick={onToggleFav} disabled={!isInitialized || pending} variant={variant}
      label={t(pressed ? "listing.favoriteRemove" : "listing.favoriteAdd")}
      aria-pressed={pressed} aria-busy={pending} className={className}>
      <Heart aria-hidden size={21} weight={pressed ? "fill" : "regular"} className={pressed ? "text-pink-500" : undefined} />
    </IconButton>
  );
}
