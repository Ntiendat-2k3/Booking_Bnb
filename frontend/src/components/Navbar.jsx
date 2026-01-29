"use client";

import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/store/authThunks";
import SearchPills from "./SearchPills";
import { GlobeIcon, MenuIcon } from "./icons";

export default function Navbar() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between h-16 max-w-6xl px-4 mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-rose-500"
        >
          <span className="text-xl">airbnb</span>
        </Link>

        <SearchPills />

        <div className="flex items-center gap-3">
          {user?.role === "host" || user?.role === "admin" ? (
            <Link
              href="/host/listings"
              className="hidden px-3 py-2 text-sm rounded-full md:inline hover:bg-slate-100"
            >
              Quản lý phòng
            </Link>
          ) : (
            <Link
              href="/host"
              className="hidden px-3 py-2 text-sm rounded-full md:inline hover:bg-slate-100"
            >
              Trở thành host
            </Link>
          )}

          <button
            className="hidden p-2 rounded-full md:inline-flex hover:bg-slate-100"
            aria-label="Language"
          >
            <GlobeIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-2 py-1 border rounded-full shadow-sm hover:shadow">
            <button className="p-2 rounded-full" aria-label="Menu">
              <MenuIcon className="w-5 h-5" />
            </button>

            {!user ? (
              <div className="flex items-center gap-2 pr-2 text-sm">
                <Link href="/login" className="font-medium hover:underline">
                  Đăng nhập
                </Link>
                <span className="text-slate-300">|</span>
                <Link href="/register" className="font-medium hover:underline">
                  Đăng ký
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 pr-2 text-sm">
                <Link href="/profile" className="font-medium hover:underline">
                  {user.full_name}
                </Link>
                <span className="text-slate-300">|</span>
                <Link href="/trips" className="font-medium hover:underline">
                  Chuyến đi
                </Link>
                <span className="text-slate-300">|</span>
                <Link href="/favorites" className="font-medium hover:underline">
                  Yêu thích
                </Link>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => dispatch(logout())}
                  className="font-medium hover:underline"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
