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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-rose-500">
          <span className="text-xl">airbnb</span>
        </Link>

        <SearchPills />

        <div className="flex items-center gap-3">
                    {user?.role === "host" || user?.role === "admin" ? (
            <Link href="/host/listings" className="hidden md:inline rounded-full px-3 py-2 text-sm hover:bg-slate-100">
              Quản lý phòng
            </Link>
          ) : (
            <Link href="/host" className="hidden md:inline rounded-full px-3 py-2 text-sm hover:bg-slate-100">
              Trở thành host
            </Link>
          )}

          <button className="hidden md:inline-flex rounded-full p-2 hover:bg-slate-100" aria-label="Language">
            <GlobeIcon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 rounded-full border px-2 py-1 shadow-sm hover:shadow">
            <button className="rounded-full p-2" aria-label="Menu">
              <MenuIcon className="h-5 w-5" />
            </button>

            {!user ? (
              <div className="flex items-center gap-2 pr-2 text-sm">
                <Link href="/login" className="font-medium hover:underline">Đăng nhập</Link>
                <span className="text-slate-300">|</span>
                <Link href="/register" className="font-medium hover:underline">Đăng ký</Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 pr-2 text-sm">
                <Link href="/profile" className="font-medium hover:underline">
                  {user.full_name}
                </Link>
                <span className="text-slate-300">|</span>
                <Link href="/favorites" className="font-medium hover:underline">Yêu thích</Link>
                <span className="text-slate-300">|</span>
                <button onClick={() => dispatch(logout())} className="font-medium hover:underline">
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
