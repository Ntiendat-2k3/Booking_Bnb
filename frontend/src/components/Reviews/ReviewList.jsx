"use client";

import Image from "next/image";
import Stars from "./Stars";

export default function ReviewList({ loading, items, meta, load }) {
  if (loading) {
    return <div className="mt-4 text-slate-600">Đang tải...</div>;
  }

  if (items.length === 0) {
    return <div className="mt-4 text-slate-600">Chưa có đánh giá nào.</div>;
  }

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((rv) => (
          <div key={rv.id} className="rounded-2xl border p-4">
            <div className="flex items-center gap-2">
              <Image
                src={rv.reviewer?.avatar_url || "https://i.pravatar.cc/150"}
                alt={rv.reviewer?.full_name ? `Avatar ${rv.reviewer.full_name}` : "Avatar"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{rv.reviewer?.full_name || "Người dùng"}</div>
                <div className="mt-0.5">
                  <Stars value={rv.rating} />
                </div>
              </div>
            </div>
            {rv.comment && <p className="mt-2 text-sm text-slate-700">{rv.comment}</p>}
          </div>
        ))}
      </div>

      {meta.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            disabled={meta.page <= 1}
            onClick={() => load(meta.page - 1)}
          >
            Trước
          </button>
          <div className="text-sm text-slate-600">
            Trang {meta.page}/{meta.total_pages}
          </div>
          <button
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            disabled={meta.page >= meta.total_pages}
            onClick={() => load(meta.page + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </>
  );
}
