"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/authStore";

export default function AdminShell({ children }) {
  const router = useRouter();

  async function onLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } catch {}
    clearAccessToken();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r bg-white p-4">
          <div className="mb-4 text-lg font-semibold">Admin Dashboard</div>
          <nav className="space-y-1 text-sm">
            <Link className="block rounded px-2 py-2 hover:bg-zinc-50" href="/dashboard">Overview</Link>
            <Link className="block rounded px-2 py-2 hover:bg-zinc-50" href="/dashboard/users">Users</Link>
            <Link className="block rounded px-2 py-2 hover:bg-zinc-50" href="/dashboard/listings">Listings</Link>
            <Link className="block rounded px-2 py-2 hover:bg-zinc-50" href="/dashboard/amenities">Amenities</Link>
            <Link className="block rounded px-2 py-2 hover:bg-zinc-50" href="/dashboard/bookings">Bookings</Link>
            <Link className="block rounded px-2 py-2 hover:bg-zinc-50" href="/dashboard/payments">Payments</Link>
            <Link className="block rounded px-2 py-2 hover:bg-zinc-50" href="/dashboard/reviews">Reviews</Link>
          </nav>
        </aside>

        <div className="flex-1">
          <header className="flex h-14 items-center justify-between border-b bg-white px-6">
            <div className="text-sm text-zinc-600">Booking BnB Admin</div>
            <button onClick={onLogout} className="rounded border px-3 py-1 text-sm hover:bg-zinc-50">
              Logout
            </button>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
