"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function guard() {
      try {
        await apiFetch("/api/v1/auth/csrf", { method: "GET" });
        try {
          const me = await apiFetch("/api/v1/auth/profile", { method: "GET" });
          if (me.data?.role !== "admin") throw new Error("not admin");
          setLoading(false);
          return;
        } catch (e) {
          if (e?.status !== 401) throw e;
        }
        await apiFetch("/api/v1/auth/refresh", { method: "POST", body: JSON.stringify({}) });
        const me2 = await apiFetch("/api/v1/auth/profile", { method: "GET" });
        if (me2.data?.role !== "admin") throw new Error("not admin");
        setLoading(false);
      } catch {
        router.replace("/login");
      }
    }
    guard();
  }, [router]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <AdminShell>
      <h1 className="text-2xl font-semibold">Listings</h1>
      <p className="mt-2 text-zinc-600">Module placeholder (Sprint 2+)</p>
    </AdminShell>
  );
}
