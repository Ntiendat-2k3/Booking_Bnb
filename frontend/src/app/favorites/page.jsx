"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import ListingCard from "@/components/ListingCard";
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import Link from "next/link";

export default function FavoritesPage() {
  const router = useRouter();
  const user = useSelector((s) => s.auth.user);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const res = await apiFetch("/api/v1/favorites", { method: "GET" });
        setItems(res.data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-slate-900">Danh sách yêu thích</h1>
        <p className="text-slate-500">Những địa điểm bạn đã lưu lại cho chuyến đi sắp tới.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map((it) => (
            <ListingCard key={it.id} listing={it} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-100 rounded-3xl shadow-sm text-center">
          <div className="w-20 h-20 bg-rose-50 text-brand rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">Tạo danh sách yêu thích đầu tiên của bạn</h3>
          <p className="mt-3 text-slate-500 max-w-md mx-auto">
            Khi bạn tìm thấy nơi bạn muốn đến, hãy nhấn vào biểu tượng trái tim để lưu lại phòng nghỉ đó.
          </p>
          <Link href="/" className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
            Bắt đầu khám phá
          </Link>
        </div>
      )}
    </div>
  );
}
