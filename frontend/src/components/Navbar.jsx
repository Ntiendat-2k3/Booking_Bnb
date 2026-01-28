"use client";

import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/store/authThunks";

export default function Navbar() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Airbnb Clone
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/search" className="hover:underline">
            Tìm phòng
          </Link>
          <Link href="/favorites" className="hover:underline">
            Yêu thích
          </Link>
          <Link href="/trips" className="hover:underline">
            Chuyến đi
          </Link>
          <Link href="/host/listings" className="hover:underline">
            Cho thuê
          </Link>

          {!user ? (
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-md border px-3 py-1 hover:bg-slate-50">
                Đăng nhập
              </Link>
              <Link href="/register" className="rounded-md border px-3 py-1 hover:bg-slate-50">
                Đăng ký
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="rounded-md border px-3 py-1 hover:bg-slate-50">
                {user.full_name}
              </Link>
              <button
                onClick={() => dispatch(logout())}
                className="rounded-md border px-3 py-1 hover:bg-slate-50"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
