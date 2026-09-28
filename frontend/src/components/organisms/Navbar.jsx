"use client";

import Link from "next/link";
import { List } from "@phosphor-icons/react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/store/authThunks";
import { useTranslations } from "@/i18n/LocaleProvider";
import SearchPills from "@/components/Search/SearchPills";
import Container from "@/components/layout/Container";
import Dropdown from "@/components/molecules/Dropdown";
import Avatar from "@/components/atoms/Avatar";
import NotificationBell from "./NotificationBell";
import LocaleSwitcher from "@/components/molecules/LocaleSwitcher";

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

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xl">
      <Container className="flex h-[72px] items-center justify-between gap-4">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-[-0.035em] text-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
          aria-label={t("navigation.home")}
        >{t("seo.siteName")}</Link>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <SearchPills />
        </div>

        <div className="flex shrink-0 items-center gap-1">
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

              <NotificationBell />
          <div className="hidden md:block">
            <LocaleSwitcher compact />
          </div>

          <Dropdown
            label={t("navigation.menu")}
            widthClass="w-72"
            button={
              <span className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-1.5 shadow-sm transition hover:shadow-soft">
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
                <div className="border-t border-line px-1 pt-1 md:hidden">
                  <LocaleSwitcher />
                </div>
              </div>
            )}
          </Dropdown>
        </div>
      </Container>
    </header>
  );
}
