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
    // { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/users", label: "Users", icon: Users },
    { href: "/dashboard/listings", label: "Listings", icon: Home },
    { href: "/dashboard/amenities", label: "Amenities", icon: Sparkles },
    { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  ];

  return (
    <div className="min-h-screen app-bg ui-fg">
      <div className="flex min-h-screen">
        <aside className="hidden border-r w-72 shrink-0 ui-border ui-panel md:block">
          <div className="p-5">
            <div className="p-4 text-white shadow-sm rounded-2xl brand-gradient">
              <div className="text-sm font-semibold">BnB Admin Console</div>
              <div className="mt-1 text-xs text-white/80">
                Management dashboard
              </div>
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
                    active ? "nav-active shadow-sm" : "nav-link",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "grid h-9 w-9 place-items-center rounded-xl",
                      active
                        ? "bg-white/10"
                        : "bg-white/5 group-hover:bg-white/10",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-4 w-4",
                        active ? "text-white" : "ui-muted",
                      ].join(" ")}
                    />
                  </span>
                  <span className="font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-30 border-b ui-border bg-black/20 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 h-14 md:px-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl brand-bg px-3 py-1.5 text-xs font-semibold text-white md:hidden">
                  Admin
                </div>
                <div className="text-sm font-semibold ui-fg">
                  {navItems.find((x) => x.href === pathname)?.label ||
                    "Dashboard"}
                </div>
              </div>

              <Button variant="secondary" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </header>

          <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
