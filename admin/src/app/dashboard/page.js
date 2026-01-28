"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function boot() {
  try {
    await apiFetch("/api/v1/auth/csrf", { method: "GET" });

    try {
      const profile = await apiFetch("/api/v1/auth/profile", { method: "GET" });
      if (profile.data?.role !== "admin") {
        router.replace("/login");
        return;
      }
      setMe(profile.data);
      return;
    } catch (e) {
      if (e?.status !== 401) throw e;
    }

    await apiFetch("/api/v1/auth/refresh", { method: "POST", body: JSON.stringify({}) });

    const profile2 = await apiFetch("/api/v1/auth/profile", { method: "GET" });
    if (profile2.data?.role !== "admin") {
      router.replace("/login");
      return;
    }
    setMe(profile2.data);
  } catch {
    router.replace("/login");
  } finally {
    setLoading(false);
  }
}
boot();
  }, [router]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <AdminShell>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-zinc-600">Xin chào, {me?.full_name} (admin)</p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm text-zinc-500">Users</div>
            <div className="text-2xl font-semibold">—</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm text-zinc-500">Listings</div>
            <div className="text-2xl font-semibold">—</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm text-zinc-500">Bookings</div>
            <div className="text-2xl font-semibold">—</div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
