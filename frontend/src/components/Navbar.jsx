"use client";

import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/store/authThunks";
import SearchPills from "./SearchPills";
import { GlobeIcon, MenuIcon } from "./icons";
import Container from "./layout/Container";
import Dropdown from "./ui/Dropdown";
import Avatar from "./ui/Avatar";

function MenuItem({ href, onClick, children }) {
  const base =
    "block w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50";
  if (href) {
    return (
      <Link href={href} className={base} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={base} onClick={onClick}>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-slate-200" />;
}

export default function Navbar() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-brand"
        >
          <span className="text-xl">airbnb</span>
        </Link>

        <SearchPills />

        <div className="flex items-center gap-2 sm:gap-3">
          {user?.role === "host" || user?.role === "admin" ? (
            <Link
              href="/host/listings"
              className="hidden md:inline rounded-full px-3 py-2 text-sm hover:bg-slate-100"
            >
              Quản lý phòng
            </Link>
          ) : (
            <Link
              href="/host"
              className="hidden md:inline rounded-full px-3 py-2 text-sm hover:bg-slate-100"
            >
              Trở thành host
            </Link>
          )}

          <button
            className="hidden md:inline-flex rounded-full p-2 hover:bg-slate-100"
            aria-label="Language"
          >
            <GlobeIcon className="h-5 w-5" />
          </button>

          <Dropdown
            button={
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm transition hover:shadow">
                <span className="rounded-full p-2" aria-hidden>
                  <MenuIcon className="h-5 w-5" />
                </span>

                <div className="flex items-center gap-2 pr-1">
                  <Avatar
                    // support common avatar fields without changing logic
                    src={user?.avatar_url || user?.avatar || user?.photo_url}
                    name={user?.full_name}
                    size={28}
                  />
                  <span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">
                    {user?.full_name || "Tài khoản"}
                  </span>
                </div>
              </div>
            }
          >
            {({ close }) => (
              <div className="py-2">
                {!user ? (
                  <>
                    <MenuItem href="/login" onClick={close}>
                      Đăng nhập
                    </MenuItem>
                    <MenuItem href="/register" onClick={close}>
                      Đăng ký
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <div className="px-4 pb-2 pt-1">
                      <div className="text-sm font-semibold">{user.full_name}</div>
                      <div className="text-xs text-slate-500">{user.role}</div>
                    </div>
                    <Divider />
                    <MenuItem href="/profile" onClick={close}>
                      Hồ sơ
                    </MenuItem>
                    <MenuItem href="/account/settings" onClick={close}>
                      Cài đặt
                    </MenuItem>
                    <MenuItem href="/trips" onClick={close}>
                      Chuyến đi
                    </MenuItem>
                    <MenuItem href="/favorites" onClick={close}>
                      Yêu thích
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      onClick={() => {
                        close();
                        dispatch(logout());
                      }}
                    >
                      Đăng xuất
                    </MenuItem>
                  </>
                )}
              </div>
            )}
          </Dropdown>
        </div>
      </Container>
    </header>
  );
}
