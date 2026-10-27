"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { clearAccessToken } from "@/lib/authStore";
import { isAdminRole } from "@/lib/roles";
import Button from "@/components/atoms/Button";
import RipleLoading from "@/components/atoms/RipleLoading";
import LocaleSwitcher from "@/components/molecules/LocaleSwitcher";
import ThemeSwitcher from "@/components/molecules/ThemeSwitcher";
import { useTranslations } from "@/i18n/LocaleProvider";
import {
  LayoutDashboard,
  Users,
  Home,
  Sparkles,
  CalendarCheck,
  CreditCard,
  RotateCcw,
  Star,
  LogOut,
  Menu,
  X,
  Mountain,
  TicketPercent,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "nav.overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "nav.users", icon: Users },
  { href: "/dashboard/listings", label: "nav.listings", icon: Home },
  { href: "/dashboard/amenities", label: "nav.amenities", icon: Sparkles },
  { href: "/dashboard/bookings", label: "nav.bookings", icon: CalendarCheck },
  { href: "/dashboard/payments", label: "nav.payments", icon: CreditCard },
  { href: "/dashboard/coupons", label: "nav.coupons", icon: TicketPercent },
    { href: "/dashboard/refunds", label: "nav.refunds", icon: RotateCcw },
    { href: "/dashboard/disputes", label: "nav.disputes", icon: CreditCard },
  { href: "/dashboard/reviews", label: "nav.reviews", icon: Star },
];

export default function AdminShell({ children }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    async function init() {
      try {
        const csrfRes = await apiFetch("/api/v1/auth/csrf", { method: "GET" });
        if (csrfRes?.data?.csrfToken) {
          const { setManualCsrfToken } = await import("@/lib/api");
          setManualCsrfToken(csrfRes.data.csrfToken);
        }
        try {
          const me = await apiFetch("/api/v1/auth/profile", { method: "GET" });
          if (!isAdminRole(me.data?.role)) throw new Error("not admin");
        } catch (e) {
          if (e?.status !== 401) throw e;
          await apiFetch("/api/v1/auth/refresh", {
            method: "POST",
            body: JSON.stringify({}),
          });
          const me2 = await apiFetch("/api/v1/auth/profile", { method: "GET" });
          if (!isAdminRole(me2.data?.role)) throw new Error("not admin");
        }
      } catch {
        router.replace("/login");
      } finally {
        if (alive) setAuthLoading(false);
      }
    }

    init();
    return () => { alive = false; };
  }, [router]);

  useEffect(() => { setIsSidebarOpen(false); }, [pathname]);

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

  if (authLoading) return <RipleLoading />;

  const currentPage = t(navItems.find((item) => item.href === pathname)?.label || "nav.overview");

  return (
    <div className="admin-shell flex min-h-[100dvh] app-bg">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label={t("nav.closeNavigation")}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r transition-transform duration-200 lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="admin-brand flex min-h-20 items-center justify-between gap-3 px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 text-[#fffdf4]">
            <Mountain className="h-8 w-8 shrink-0 text-[#c6a565]" strokeWidth={1.7} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold tracking-[-0.05em]">Booking BnB</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#bbcdb9]">{t("nav.adminConsole")}</span>
            </span>
          </Link>
          <button type="button" className="p-2 text-[#f7f4ed] lg:hidden" aria-label={t("nav.closeNavigation")} onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6" aria-label={t("nav.adminNavigation")}>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className="admin-nav-link mb-1 flex min-h-11 items-center gap-3 px-4 text-sm font-medium transition-colors">
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span>{t(label)}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer border-t px-4 py-4">
          <Button variant="ghost" className="w-full justify-start border-0 px-3" onClick={onLogout}>
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("nav.logout")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="admin-header sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b px-5 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button type="button" className="border border-[var(--admin-control-line)] p-2 lg:hidden" aria-label={t("nav.openNavigation")} onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 text-sm text-[var(--admin-muted)]">
              <span className="hidden sm:inline">Booking BnB</span>
              <span className="mx-2 hidden text-[var(--admin-gold)] sm:inline">/</span>
              <span className="truncate font-semibold text-[var(--admin-ink)]">{currentPage}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <LocaleSwitcher />
            <ThemeSwitcher compact />
            <span className="ml-1 grid h-9 w-9 place-items-center bg-[var(--admin-forest)] text-sm font-semibold text-[var(--admin-on-primary)]" aria-hidden="true">A</span>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold">{t("nav.systemAdmin")}</div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">{t("nav.fullAccess")}</div>
            </div>
          </div>
        </header>

        <main id="main-content" className="admin-main flex-1 px-5 py-7 md:px-8 md:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
