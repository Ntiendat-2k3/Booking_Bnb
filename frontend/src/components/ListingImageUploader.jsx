"use client";

import { useState } from "react";
import { apiUpload } from "@/lib/apiUpload";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";

export default function ListingImageUploader({ listingId }) {
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);

  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (!listingId) {
      notifyError("Bạn cần nhập Listing ID để upload ảnh");
      return;
    }

    setBusy(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);

        // 1) upload to cloudinary
        const up = await apiUpload(`/api/v1/uploads/listing-image?listing_id=${encodeURIComponent(listingId)}`, fd);
        const u = up.data;

        // 2) attach to listing in DB
        const attached = await apiFetch(`/api/v1/host/listings/${listingId}/images`, {
          method: "POST",
          body: JSON.stringify({
            url: u.url,
            public_id: u.public_id,
            width: u.width,
            height: u.height,
            bytes: u.bytes,
            format: u.format,
            resource_type: u.resource_type,
            is_cover: items.length === 0, // first image as cover by default
            sort_order: items.length,
          }),
        });

        setItems((prev) => [attached.data.image, ...prev]);
      }

      notifySuccess("Upload ảnh thành công");
      e.target.value = "";
    } catch (err) {
      notifyError(err?.message || "Upload thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(image) {
    if (!listingId) return;
    try {
      await apiFetch(`/api/v1/host/listings/${listingId}/images/${image.id}`, { method: "DELETE", body: JSON.stringify({}) });
      setItems((prev) => prev.filter((x) => x.id !== image.id));
      notifySuccess("Đã xóa ảnh");
    } catch (e) {
      notifyError(e?.message || "Xóa ảnh thất bại");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Upload ảnh (Cloudinary)</div>
        <p className="mt-1 text-sm text-slate-600">
          Chỉ host/admin. Chọn ảnh (jpg/png/webp). Ảnh sẽ upload Cloudinary rồi lưu vào bảng <b>listing_images</b>.
        </p>

        <div className="mt-3 flex items-center gap-3">
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={onPick}
            disabled={busy}
            className="block w-full text-sm"
          />
        </div>

        {busy ? <div className="mt-2 text-sm text-slate-600">Đang upload...</div> : null}
      </div>

      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((im) => (
            <div key={im.id} className="overflow-hidden rounded-2xl border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="h-44 w-full object-cover" />
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="truncate text-xs text-slate-600">{im.public_id || "no public_id"}</div>
                <button
                  onClick={() => onRemove(im)}
                  className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-slate-50"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
          Chưa có ảnh upload.
        </div>
      )}
    </div>
  );
}
