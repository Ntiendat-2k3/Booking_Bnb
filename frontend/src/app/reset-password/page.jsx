"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid_link");
      setMessage("Liên kết không hợp lệ hoặc không có mã xác thực.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        body: { token, newPassword: password },
      });
      setStatus("success");
      setMessage("Mật khẩu của bạn đã được thay đổi thành công!");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Không thể đặt lại mật khẩu. Có thể liên kết đã hết hạn.");
    }
  };

  if (status === "invalid_link") {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-red-200">
           <div className="text-center text-red-600 font-semibold">{message}</div>
           <div className="text-center mt-4">
              <Link href="/forgot-password" className="text-brand font-semibold hover:underline">
                Yêu cầu lại liên kết mới
              </Link>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
            Đặt lại mật khẩu
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Vui lòng tạo mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        {status === "success" ? (
          <div className="rounded-xl bg-green-50 p-4 border border-green-200 text-center">
            <h3 className="text-lg font-bold text-green-800 mb-2">Thành công!</h3>
            <p className="text-sm font-medium text-green-700">{message}</p>
            <p className="text-xs text-green-600 mt-4">Đang tự động chuyển hướng về trang đăng nhập...</p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {status === "error" && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="text-sm text-red-700">{message}</div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === "loading"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={status === "loading"}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="group relative flex w-full justify-center rounded-xl bg-brand py-3 px-4 text-sm font-semibold text-white hover:bg-brand-dark focus:outline-none disabled:opacity-70 transition"
              >
                {status === "loading" ? "Đang xử lý..." : "Lưu mật khẩu"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
