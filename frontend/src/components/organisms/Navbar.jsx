"use client";

import Link from "next/link";
import { ArrowLeft, CalendarBlank, Heart, House, List, MagnifyingGlass, Mountains, UserCircle } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/store/authThunks";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Container from "@/components/layout/Container";
import Dropdown from "@/components/molecules/Dropdown";
import Avatar from "@/components/atoms/Avatar";
import NotificationBell from "./NotificationBell";
import LocaleSwitcher from "@/components/molecules/LocaleSwitcher";
import ThemeSwitcher from "@/components/molecules/ThemeSwitcher";

const MOBILE_LINKS = [
  { href: "/", label: "navigation.home", Icon: House },
  { href: "/favorites", label: "navigation.favorites", Icon: Heart },
  { href: "/trips", label: "navigation.trips", Icon: CalendarBlank },
  { href: "/profile", label: "navigation.profile", Icon: UserCircle },
];

function MenuItem({ href, onClick, children }) {
  const base =
    "block min-h-11 w-full px-4 py-3 text-left text-sm font-medium text-ink transition hover:bg-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand";
  if (href) {
    return (
      <Link href={href} className={base} onClick={onClick} role="menuitem">
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={base} onClick={onClick} role="menuitem">
      {children}
    </button>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-line" role="separator" />;
}

export default function Navbar() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const t = useTranslations();
  const pathname = usePathname();
  const isRoomPage = pathname.startsWith("/rooms/");
  const isNaturePage = pathname === "/" || isRoomPage;

  return (
    <>
    <header className={"site-header sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xl " + (isNaturePage ? `nature-header ${isRoomPage ? "room-header" : ""}` : "")}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:text-on-ink">{t("navigation.skipToContent")}</a>
      <Container className="flex h-[var(--header-height)] items-center justify-between gap-4">
        {isRoomPage && <Link href="/search" aria-label={t("room.backSearch")} className="room-back hidden"><ArrowLeft aria-hidden size={22} /></Link>}
        <Link
          href="/"
          className="site-wordmark flex shrink-0 items-center gap-2 text-xl font-bold tracking-[-0.05em] text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 sm:text-2xl"
          aria-label={t("navigation.home")}
        ><Mountains aria-hidden size={30} className="brand-mark" />{t("seo.siteName")}</Link>

        <nav aria-label={t("navigation.home")} className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex">
          <Button href="/search" variant="ghost" size="sm" aria-current={pathname === "/search" ? "page" : undefined} className={pathname === "/search" ? "bg-muted-surface" : undefined}><MagnifyingGlass aria-hidden size={18} />{t("common.search")}</Button>
          <Button href="/favorites" variant="ghost" size="sm" aria-current={pathname === "/favorites" ? "page" : undefined}>{t("navigation.favorites")}</Button>
          <Button href="/trips" variant="ghost" size="sm" aria-current={pathname === "/trips" ? "page" : undefined}>{t("navigation.trips")}</Button>
        </nav>

        <div className="header-actions flex shrink-0 items-center gap-1">
          <Button href="/search" variant="ghost" size="sm" className="mobile-header-search lg:hidden" aria-label={t("common.search")}><MagnifyingGlass aria-hidden size={22} /></Button>
          {user?.role === "host" || user?.role === "admin" ? (
                <nav
                  className="hidden items-center gap-1 xl:flex"
                  aria-label={t("navigation.hostDashboard")}
                >
                  <Link
                    href="/host/dashboard"
                    className="rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-muted-surface"
                  >
                    {t("navigation.hostDashboard")}
                  </Link>
                  <Link
                    href="/host/listings"
                    className="rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-muted-surface"
                  >
                    {t("navigation.manageListings")}
                  </Link>
                </nav>
              ) : (
                <Link
                  href="/host"
                  className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink transition hover:bg-muted-surface xl:inline-flex"
                >
                  {t("navigation.becomeHost")}
                </Link>
              )}

          <div className="header-notifications"><NotificationBell /></div>
          <div className="hidden items-center gap-1 lg:flex">
            <LocaleSwitcher compact />
            <ThemeSwitcher compact />
          </div>

          <Dropdown
            label={t("navigation.menu")}
            widthClass="w-72"
            button={
              <span className="navbar-menu-trigger flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-1.5 shadow-sm transition hover:shadow-soft">
                  <List aria-hidden size={20} />
                  <Avatar
                    src={user?.avatar_url || user?.avatar || user?.photo_url}
                    name={user?.full_name || t("common.account")}
                    size={30}
                  />
                  <span className="sr-only">{t("navigation.menu")}</span>
              </span>
            }
          >
            {({ close }) => (
              <div className="py-2">
                <MenuItem href="/search" onClick={close}>{t("common.search")}</MenuItem>
                {!user ? (
                  <>
                    <MenuItem href="/login" onClick={close}>
                      {t("navigation.login")}
                    </MenuItem>
                    <MenuItem href="/register" onClick={close}>
                      {t("navigation.register")}
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <div className="px-4 pb-3 pt-2">
                      <div className="truncate text-sm font-semibold text-ink">
                        {user.full_name || t("common.account")}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-ink">{t(user.role === "host" ? "navigation.hostRole" : user.role === "admin" ? "navigation.adminRole" : "navigation.guestRole")}</div>
                    </div>
                    <Divider />
                    <MenuItem href="/profile" onClick={close}>
                      {t("navigation.profile")}
                    </MenuItem>
                    <MenuItem href="/account/settings" onClick={close}>
                      {t("navigation.settings")}
                    </MenuItem>
                    <MenuItem href="/trips" onClick={close}>
                      {t("navigation.trips")}
                    </MenuItem>
                    <MenuItem href="/favorites" onClick={close}>
                      {t("navigation.favorites")}
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      onClick={() => {
                        close();
                        dispatch(logout());
                      }}
                    >
                      {t("navigation.logout")}
                    </MenuItem>
                  </>
                )}
                <Divider />
                {user?.role === "host" || user?.role === "admin" ? <><MenuItem href="/host/dashboard" onClick={close}>{t("navigation.hostDashboard")}</MenuItem><MenuItem href="/host/listings" onClick={close}>{t("navigation.manageListings")}</MenuItem></> : <MenuItem href="/host" onClick={close}>{t("navigation.becomeHost")}</MenuItem>}
                <div className="space-y-2 border-t border-line px-4 pt-3 lg:hidden">
                  <LocaleSwitcher />
                  <ThemeSwitcher />
                </div>
              </div>
            )}
          </Dropdown>
        </div>
      </Container>
    </header>
    {isNaturePage && <nav className="mobile-dock md:hidden" aria-label={t("navigation.home")}>
      {MOBILE_LINKS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={pathname === href || (href === "/" && isRoomPage) ? "page" : undefined}>
          <Icon aria-hidden size={25} />
          <span>{t(label)}</span>
        </Link>
      ))}
    </nav>}
    </>
  );
}
