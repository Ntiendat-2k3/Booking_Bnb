"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerLocal } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

export default function RegisterPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const user = useSelector((s) => s.auth.user);
  const status = useSelector((s) => s.auth.status);
  const isInitialized = useSelector((s) => s.auth.isInitialized);
  const error = useSelector((s) => s.auth.error);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (isInitialized && user && status !== "loading") {
      toast.info("Bạn đã đăng nhập rồi!");
      router.replace("/");
    }
  }, [isInitialized, user, status, router]);

  async function onSubmit(e) {
    e.preventDefault();
    const ok = await dispatch(registerLocal({ email, password, full_name: fullName }));
    if (ok) router.push("/profile");
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center p-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        
        {/* Left Side - Image */}
        <div className="relative hidden w-1/2 bg-slate-100 lg:block">
          <Image
            src="https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?q=80&w=1000&auto=format&fit=crop"
            alt="Interior register cover"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8 text-white">
            <h2 className="text-3xl font-bold mb-2">Bắt đầu hành trình</h2>
            <p className="text-white/90">Tham gia cùng hàng triệu người dùng trên toàn thế giới để trải nghiệm những chuyến đi độc đáo.</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full p-8 sm:p-12 lg:w-1/2">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Đăng ký tài khoản</h1>
            <p className="mt-2 text-sm text-slate-600">
              Hãy điền thông tin bên dưới để tạo tài khoản mới
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Họ và tên</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Mật khẩu</label>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943-9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error ? <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p> : null}

            <p className="text-xs text-slate-500">
              Bằng cách chọn Đăng ký, tôi đồng ý với các{" "}
              <Link href="#" className="font-semibold text-brand hover:underline">Điều khoản Dịch vụ</Link>,{" "}
              <Link href="#" className="font-semibold text-brand hover:underline">Chính sách Thanh toán</Link>, và{" "}
              <Link href="#" className="font-semibold text-brand hover:underline">Chính sách Quyền riêng tư</Link> của Booking BnB.
            </p>

            <button
              disabled={status === "loading"}
              className="mt-2 w-full rounded-xl bg-brand px-4 py-3.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Đang tạo tài khoản...</span>
                </div>
              ) : (
                "Đăng ký"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
