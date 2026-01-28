"use client";

import { useState } from "react";
import ListingImageUploader from "@/components/ListingImageUploader";

export default function Page() {
  const [listingId, setListingId] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Host • Quản lý ảnh phòng</h1>
        <p className="text-slate-600">
          Sprint ảnh: upload Cloudinary + lưu DB. Bạn cần có tài khoản role <b>host</b> hoặc <b>admin</b>.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <label className="text-sm font-semibold">Listing ID</label>
        <input
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          className="mt-2 w-full rounded-xl border px-3 py-2"
          placeholder="Nhập UUID listing để gắn ảnh"
        />
        <p className="mt-2 text-xs text-slate-600">
          Tip: copy ID từ URL trang detail hoặc lấy từ DB bảng <b>listings</b>.
        </p>
      </div>

      <ListingImageUploader listingId={listingId} />
    </div>
  );
}
