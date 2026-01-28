"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile } from "@/store/authThunks";
import Link from "next/link";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user, status, error } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!user) dispatch(fetchProfile());
  }, [dispatch, user]);

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Tài khoản</h1>
        <p className="text-slate-600">Bạn chưa đăng nhập.</p>
        <Link className="inline-block rounded-md border px-3 py-2 hover:bg-slate-50" href="/login">
          Đi tới đăng nhập
        </Link>
        {status === "loading" ? <p className="text-sm text-slate-600">Đang tải...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Hồ sơ</h1>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium">{user.full_name}</p>
          <span className="text-xs rounded-full border px-2 py-1">{user.role}</span>
        </div>
        <p className="text-sm text-slate-700">{user.email}</p>
        <p className="text-sm text-slate-700">Provider: {user.provider}</p>
        {user.provider_id ? (
          <p className="text-sm text-slate-700">Provider ID: {user.provider_id}</p>
        ) : null}
      </div>

      {status === "loading" ? <p className="text-sm text-slate-600">Đang tải...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
