"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/authStore";
import Button from "@/components/ui/Button";
import {
  LayoutDashboard,
  Users,
  Home,
  Sparkles,
  CalendarCheck,
  CreditCard,
  Star,
  LogOut,
} from "lucide-react";

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
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/users", label: "Users", icon: Users },
    { href: "/dashboard/listings", label: "Listings", icon: Home },
    { href: "/dashboard/amenities", label: "Amenities", icon: Sparkles },
    { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground)">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-(--ui-border) bg-(--ui-panel) md:block">
          <div className="p-5">
            <div className="rounded-2xl bg-gradient-to-br from-(--ui-primary) to-(--ui-primary-2) p-4 text-white shadow-sm">
              <div className="text-sm font-semibold">BnB Admin Console</div>
              <div className="mt-1 text-xs text-white/80">Management dashboard</div>
            </div>
          </div>

          <nav className="px-3 pb-6 text-sm">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                    active
                      ? "bg-(--ui-primary) text-white shadow-sm"
                      : "text-(--ui-muted) hover:bg-white/5 hover:text-(--foreground)",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "grid h-9 w-9 place-items-center rounded-xl",
                      active ? "bg-white/10" : "bg-white/5 group-hover:bg-white/10",
                    ].join(" ")}
                  >
                    <Icon className={["h-4 w-4", active ? "text-white" : "text-(--ui-muted)"].join(" ")} />
                  </span>
                  <span className="font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-(--ui-border) bg-black/20 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#FF385C] px-3 py-1.5 text-xs font-semibold text-white md:hidden">
                  Admin
                </div>
                <div className="text-sm font-semibold text-(--foreground)">
                  {navItems.find((x) => x.href === pathname)?.label || "Dashboard"}
                </div>
              </div>

              <Button variant="secondary" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
