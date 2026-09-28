"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


import { useEffect, useMemo, useState } from "react";
import { apiUpload } from "@/lib/apiUpload";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import Image from "next/image";

export default function ListingImageUploader({ listingId }) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const hasCover = useMemo(() => items.some((x) => x.is_cover), [items]);

  async function loadImages(id) {
    if (!id) {
      setItems([]);
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/host/listings/${id}`, {
        method: "GET",
      });
      const images = res.data?.listing?.images || [];
      setItems(images);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    if (!listingId) return;
    let active = true;
    apiFetch(`/api/v1/host/listings/${listingId}`, { method: "GET" })
      .then((res) => { if (active) { setItems(res.data?.listing?.images || []); setLoadError(false); } })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoadingImages(false); });
    return () => { active = false; };
  }, [listingId]);

  async function attachImage(payload) {
    const attached = await apiFetch(
      `/api/v1/host/listings/${listingId}/images`,
      {
        method: "POST",
        body: payload,
      },
    );
    return attached.data.image;
  }

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!listingId) {
      notifyError(t("images.createFirst"));
      return;
    }

    setBusy(true);
    try {
      // Duy trì thứ tự ảnh trong cùng lượt tải nhiều tệp.
      let nextOrder = items.length;
      let coverAlready = hasCover || items.length > 0;

      const newlyAdded = [];

      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);

        // Tải tệp lên dịch vụ lưu trữ trước khi gắn vào chỗ ở.
        const up = await apiUpload(
          `/api/v1/uploads/listing-image?listing_id=${encodeURIComponent(listingId)}`,
          fd,
        );
        const u = up.data;

        // Gắn ảnh đã tải thành công vào chỗ ở.
        const isCover = !coverAlready && nextOrder === 0; // Ảnh đầu tiên được dùng làm ảnh bìa.
        const img = await attachImage({
          url: u.url,
          public_id: u.public_id,
          width: u.width,
          height: u.height,
          bytes: u.bytes,
          format: u.format,
          resource_type: u.resource_type,
          is_cover: isCover,
          sort_order: nextOrder,
        });

        newlyAdded.push(img);
        nextOrder += 1;
        coverAlready = coverAlready || isCover;
      }

      setItems((prev) => [...prev, ...newlyAdded]);
      notifySuccess(t("images.uploaded"));
      e.target.value = "";
    } catch (err) {
      notifyError(err?.message || t("images.uploadFailed"));
    } finally {
      // Đồng bộ cả các ảnh đã gắn thành công nếu một tệp trong lượt tải bị lỗi.
      await loadImages(listingId);
      e.target.value = "";
      setBusy(false);
    }
  }

  async function onSetCover(image) {
    if (!listingId) return;
    setBusy(true);
    try {
      await apiFetch(
        `/api/v1/host/listings/${listingId}/images/${image.id}/cover`,
        {
          method: "PATCH",
          body: {},
        },
      );
      await loadImages(listingId);
      notifySuccess(t("images.coverSaved"));
    } catch (e) {
      notifyError(e?.message || t("images.coverFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(image) {
    if (!listingId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/host/listings/${listingId}/images/${image.id}`, {
        method: "DELETE",
      });
      await loadImages(listingId); // Đồng bộ lại vì máy chủ có thể chọn ảnh bìa mới.
      notifySuccess(t("images.deleted"));
    } catch (e) {
      notifyError(e?.message || t("images.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  const sorted = items
    .slice()
    .sort(
      (a, b) =>
        (b.is_cover === true) - (a.is_cover === true) ||
        (a.sort_order || 0) - (b.sort_order || 0),
    );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-surface p-4">
        <div className="text-sm font-semibold">{t("images.title")}</div>

        <div className="mt-3">
          <input
            type="file"
            aria-label={t("images.upload")}
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={onPick}
            disabled={busy || loadingImages || !listingId}
            className="block w-full text-sm"
          />
        </div>

        {busy ? (
          <div className="mt-2 text-sm text-muted-ink">{t("common.processing")}</div>
        ) : null}
      </div>

      {loadingImages ? <p role="status">{t("common.loading")}</p> : loadError ? <div role="alert"><p>{t("images.loadFailed")}</p><button type="button" className="mt-2 min-h-11 rounded-xl border border-line px-3" onClick={() => loadImages(listingId)}>{t("common.retry")}</button></div> : sorted.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((im) => (
            <div
              key={im.id}
              className="overflow-hidden rounded-2xl border bg-surface"
            >
              <div className="relative h-44 w-full">
                <Image
                  src={im.url}
                  alt={t("images.alt")}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="space-y-2 p-3">
                <div className="truncate text-xs text-muted-ink">
                  {im.is_cover ? (
                    <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">{t("images.cover")}</span>
                  ) : null}
                  {im.public_id || "cloudinary"}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!im.is_cover ? (
                    <button
                      type="button"
                      onClick={() => onSetCover(im)}
                      disabled={busy}
                      className="min-h-11 rounded-lg border px-3 py-1 text-xs font-medium hover:bg-muted-surface disabled:opacity-60"
                    >{t("images.setCover")}</button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onRemove(im)}
                    disabled={busy}
                    className="min-h-11 rounded-lg border px-3 py-1 text-xs font-medium hover:bg-muted-surface disabled:opacity-60"
                  >{t("common.delete")}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-surface p-4 text-sm text-muted-ink">{t("images.empty")}</div>
      )}
    </div>
  );
}
