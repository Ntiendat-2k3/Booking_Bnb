"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


import { useEffect, useId, useMemo, useState } from "react";
import { ImagesSquare, Trash, UploadSimple, CheckCircle } from "@phosphor-icons/react";
import { apiUpload } from "@/lib/apiUpload";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import Image from "next/image";

export default function ListingImageUploader({ listingId, onListingChange }) {
  const t = useTranslations();
  const inputId = useId();
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
      onListingChange?.();
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
      onListingChange?.();
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
      onListingChange?.();
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
    <section className="surface-panel space-y-4 p-4 sm:p-6" aria-busy={busy || loadingImages}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-control bg-brand/10 p-2.5 text-brand"><ImagesSquare aria-hidden size={23} /></span>
          <div><h2 className="text-base font-semibold">{t("host.images")}</h2><p className="mt-0.5 text-sm text-muted-ink">{t("host.imagesHint")}</p></div>
        </div>
        <span className="shrink-0 text-xs text-muted-ink">{items.length}/20</span>
      </div>

      <label htmlFor={inputId} className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line bg-muted-surface/40 px-4 py-5 text-center transition hover:border-brand/60 hover:bg-brand/5 focus-within:ring-2 focus-within:ring-brand/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
        <UploadSimple aria-hidden size={25} className="text-brand" />
        <span className="text-sm font-semibold">{t("images.upload")}</span>
        <span className="text-xs text-muted-ink">JPG, PNG, WebP · {t("host.imagesLimit")}</span>
        <input id={inputId} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={onPick} disabled={busy || loadingImages || !listingId || items.length >= 20} className="sr-only" />
      </label>

      {busy ? <p role="status" className="text-sm text-muted-ink">{t("common.processing")}</p> : null}
      {loadingImages ? <p role="status">{t("common.loading")}</p> : loadError ? <div role="alert"><p>{t("images.loadFailed")}</p><button type="button" className="mt-2 min-h-11 rounded-control border border-line px-3" onClick={() => loadImages(listingId)}>{t("common.retry")}</button></div> : sorted.length ? (
        <div className="grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-3">
          {sorted.map((im) => (
            <div key={im.id} className="overflow-hidden rounded-control border border-line bg-muted-surface/30">
              <div className="relative aspect-[4/5] w-full">
                <Image src={im.url} alt={t("images.alt")} fill unoptimized sizes="(max-width: 640px) 45vw, 150px" className="object-cover" />
                {im.is_cover ? <span className="absolute left-1.5 top-1.5 rounded-md bg-surface/95 px-1.5 py-1 text-[10px] font-semibold text-ink">{t("images.cover")}</span> : null}
              </div>
              <div className="flex justify-center divide-x divide-line border-t border-line">
                <button type="button" onClick={() => onSetCover(im)} disabled={busy || im.is_cover} aria-label={t("images.setCover")} title={t("images.setCover")} className="flex min-h-11 flex-1 items-center justify-center text-brand transition hover:bg-muted-surface disabled:opacity-40"><CheckCircle aria-hidden size={18} /></button>
                <button type="button" onClick={() => onRemove(im)} disabled={busy} aria-label={t("common.delete")} title={t("common.delete")} className="flex min-h-11 flex-1 items-center justify-center text-danger transition hover:bg-danger/10 disabled:opacity-40"><Trash aria-hidden size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="border-t border-line pt-4 text-sm text-muted-ink">{t("images.empty")}</p>}
    </section>
  );
}
