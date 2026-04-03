"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/authStore";
import Button from "@/components/ui/Button";
import RipleLoading from "@/components/loading/RipleLoading";
import {
  LayoutDashboard,
  Users,
  Home,
  Sparkles,
  CalendarCheck,
  CreditCard,
  Star,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const csrfRes = await apiFetch("/api/v1/auth/csrf", { method: "GET" });
        // Save token from response body — cross-domain cookies may not be readable
        if (csrfRes?.data?.csrfToken) {
          const { setManualCsrfToken } = await import("@/lib/api");
          setManualCsrfToken(csrfRes.data.csrfToken);
        }
        try {
          const me = await apiFetch("/api/v1/auth/profile", { method: "GET" });
          if (me.data?.role !== "admin") throw new Error("not admin");
        } catch (e) {
          if (e?.status !== 401) throw e;
          await apiFetch("/api/v1/auth/refresh", {
            method: "POST",
            body: JSON.stringify({}),
          });
          const me2 = await apiFetch("/api/v1/auth/profile", { method: "GET" });
          if (me2.data?.role !== "admin") throw new Error("not admin");
        }
      } catch {
        router.replace("/login");
      } finally {
        if (alive) setAuthLoading(false);
      }
    }

    init();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

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

  if (authLoading) return <RipleLoading />;

  return (
    <div className="min-h-screen app-bg ui-fg overflow-x-hidden">
      <div className="flex min-h-screen relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r ui-border glass transition-transform duration-300 md:relative md:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex flex-col h-full">
            <div className="p-5 flex items-center justify-between">
              <div className="grow p-4 text-white shadow-sm rounded-2xl brand-gradient">
                <div className="text-sm font-semibold">BnB Admin Console</div>
                <div className="mt-1 text-xs text-white/80">
                  Management dashboard
                </div>
              </div>
              <button
                className="ml-2 p-2 md:hidden ui-muted hover:ui-fg"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 pb-6 text-sm overflow-y-auto overflow-x-hidden">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group mb-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                      active ? "nav-active shadow-md" : "nav-link",
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

            <div className="p-4 border-t ui-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-rose-400 hover:bg-rose-400/10"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-30 border-b ui-border glass-header">
            <div className="flex items-center justify-between gap-3 px-4 h-16 md:px-8">
              <div className="flex items-center gap-4">
                <button
                  className="p-2 -ml-2 rounded-xl hover:bg-white/5 md:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5 ui-muted" />
                </button>
                <div className="flex flex-col">
                  <div className="text-xs font-semibold ui-muted uppercase tracking-wider">
                    Portal
                  </div>
                  <div className="text-lg font-bold ui-fg">
                    {navItems.find((x) => x.href === pathname)?.label ||
                      "Dashboard"}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-3">
                <div className="h-8 w-px bg-white/10 mx-2" />
                <div className="text-right hidden md:block">
                  <div className="text-xs font-semibold ui-fg">System Admin</div>
                  <div className="text-[10px] ui-muted uppercase tracking-tighter">
                    Full Access
                  </div>
                </div>
                <div className="h-10 w-10 rounded-2xl brand-gradient flex items-center justify-center text-white font-bold text-lg shadow-sm border border-white/10">
                  A
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 min-w-0 p-4 md:p-8 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
