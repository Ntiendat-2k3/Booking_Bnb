"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/authStore";

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  async function onLogout() {
    try {
      await apiFetch("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {}
    clearAccessToken();
    router.replace("/login");
  }

  const navItems = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/users", label: "Users" },
    { href: "/dashboard/listings", label: "Listings" },
    { href: "/dashboard/amenities", label: "Amenities" },
    { href: "/dashboard/bookings", label: "Bookings" },
    { href: "/dashboard/payments", label: "Payments" },
    { href: "/dashboard/reviews", label: "Reviews" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="flex min-h-screen">
        <aside className="w-64 p-4 bg-white border-r">
          <div className="mb-4 text-lg font-semibold text-zinc-900">
            Admin Dashboard
          </div>

          <nav className="space-y-1 text-sm">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded px-3 py-2 transition",
                    "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
                    active ? "bg-zinc-100 font-medium text-zinc-900" : "",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="flex items-center justify-between px-6 bg-white border-b h-14">
            <div className="text-sm text-zinc-700">Booking BnB Admin</div>
            <button
              onClick={onLogout}
              className="px-3 py-1 text-sm border rounded border-zinc-300 text-zinc-800 hover:bg-zinc-100"
            >
              Logout
            </button>
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
