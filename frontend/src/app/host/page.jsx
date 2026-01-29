"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ensureCsrf, fetchProfile, becomeHost } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import { notifyError, notifySuccess } from "@/lib/notify";

export default function HostOnboardingPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        await dispatch(ensureCsrf());
        await dispatch(fetchProfile());
      } catch {}
    }
    boot();
  }, [dispatch]);

  useEffect(() => {
    if (user?.role === "host" || user?.role === "admin") {
      router.replace("/host/listings");
    }
  }, [user, router]);

  async function onConfirm() {
    if (!checked) return notifyError("Bạn cần tick xác nhận để trở thành host");
    setBusy(true);
    try {
      const ok = await dispatch(becomeHost());
      if (ok) {
        notifySuccess("Bạn đã trở thành host ✅");
        router.replace("/host/listings");
      }
    } catch (e) {
      notifyError(e?.message || "Không thể nâng cấp host");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-xl font-semibold">Trở thành Host</h1>
          <p className="mt-2 text-slate-600">
            Bạn cần đăng nhập để đăng phòng.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
              Đăng nhập
            </Link>
            <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // guest -> can upgrade
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Xác nhận trở thành Host</h1>
        <p className="mt-2 text-slate-600">
          Chỉ cần xác nhận để mở quyền <b>đăng phòng</b> và <b>quản lý phòng</b>. (Role: guest → host)
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          Tôi xác nhận muốn trở thành Host
        </label>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={!checked || busy}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {busy ? "Đang xử lý..." : "Xác nhận"}
          </button>

          <Link href="/" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Hủy
          </Link>
        </div>
      </div>
    </div>
  );
}
