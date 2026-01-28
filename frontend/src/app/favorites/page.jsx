"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import ListingCard from "@/components/ListingCard";

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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Danh sách yêu thích</h1>

      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ListingCard key={it.id} listing={it} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-6 text-slate-600">
          Bạn chưa lưu phòng nào. Hãy bấm tim ở trang Home/Search.
        </div>
      )}
    </div>
  );
}
