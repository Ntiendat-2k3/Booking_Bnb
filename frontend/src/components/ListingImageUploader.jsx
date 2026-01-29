"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUpload } from "@/lib/apiUpload";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";

export default function ListingImageUploader({ listingId }) {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);

  const hasCover = useMemo(() => items.some((x) => x.is_cover), [items]);

  async function loadImages(id) {
    if (!id) {
      setItems([]);
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/host/listings/${id}`, { method: "GET" });
      const images = res.data?.listing?.images || [];
      setItems(images);
    } catch {
      // ignore (page will show error elsewhere)
    }
  }

  useEffect(() => {
    loadImages(listingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  async function attachImage(payload) {
    const attached = await apiFetch(`/api/v1/host/listings/${listingId}/images`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return attached.data.image;
  }

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!listingId) {
      notifyError("Bạn cần tạo phòng trước khi upload ảnh");
      return;
    }

    setBusy(true);
    try {
      // Use local counter to avoid stale state when uploading multiple files
      let nextOrder = items.length;
      let coverAlready = hasCover || items.length > 0;

      const newlyAdded = [];

      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);

        // 1) upload to cloudinary
        const up = await apiUpload(`/api/v1/uploads/listing-image?listing_id=${encodeURIComponent(listingId)}`, fd);
        const u = up.data;

        // 2) attach to listing in DB
        const isCover = !coverAlready && nextOrder === 0; // first-ever image becomes cover
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
      notifySuccess("Upload ảnh thành công");
      e.target.value = "";
    } catch (err) {
      notifyError(err?.message || "Upload thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function onSetCover(image) {
    if (!listingId) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/host/listings/${listingId}/images/${image.id}/cover`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await loadImages(listingId);
      notifySuccess("Đã đặt làm ảnh cover");
    } catch (e) {
      notifyError(e?.message || "Đặt cover thất bại");
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
        body: JSON.stringify({}),
      });
      await loadImages(listingId); // reload because cover may change server-side
      notifySuccess("Đã xóa ảnh");
    } catch (e) {
      notifyError(e?.message || "Xóa ảnh thất bại");
    } finally {
      setBusy(false);
    }
  }

  const sorted = items
    .slice()
    .sort((a, b) => (b.is_cover === true) - (a.is_cover === true) || (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Ảnh phòng</div>
        <p className="mt-1 text-sm text-slate-600">
          Chỉ hỗ trợ upload ảnh lên <b>Cloudinary</b> để dễ quản lý.
        </p>

        <div className="mt-3">
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={onPick}
            disabled={busy || !listingId}
            className="block w-full text-sm"
          />
        </div>

        {busy ? <div className="mt-2 text-sm text-slate-600">Đang xử lý...</div> : null}
      </div>

      {sorted.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((im) => (
            <div key={im.id} className="overflow-hidden rounded-2xl border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="h-44 w-full object-cover" />
              <div className="space-y-2 p-3">
                <div className="truncate text-xs text-slate-600">
                  {im.is_cover ? (
                    <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">Cover</span>
                  ) : null}
                  {im.public_id || "cloudinary"}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!im.is_cover ? (
                    <button
                      type="button"
                      onClick={() => onSetCover(im)}
                      disabled={busy}
                      className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                    >
                      Đặt cover
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onRemove(im)}
                    disabled={busy}
                    className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
          Chưa có ảnh. Hãy upload ít nhất 1 ảnh (ảnh đầu tiên sẽ là cover).
        </div>
      )}
    </div>
  );
}
