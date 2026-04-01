"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      await apiFetch("/api/v1/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setStatus("success");
      setMessage("Một liên kết khôi phục mật khẩu đã được gửi đến email của bạn.");
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Không thể gửi yêu cầu. Vui lòng thử lại sau.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
            Quên mật khẩu?
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Nhập email của bạn để nhận liên kết khôi phục.
          </p>
        </div>

        {status === "success" ? (
          <div className="rounded-xl bg-green-50 p-4 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{message}</p>
              </div>
            </div>
            <div className="mt-6 text-center">
               <Link href="/login" className="text-brand font-semibold hover:underline">
                 Trở về trang Đăng nhập
               </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {status === "error" && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="text-sm text-red-700">{message}</div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Thư điện tử (Email)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="group relative flex w-full justify-center rounded-xl bg-brand py-3 px-4 text-sm font-semibold text-white hover:bg-brand-dark focus:outline-none disabled:opacity-70 transition"
              >
                {status === "loading" ? "Đang gửi..." : "Nhận liên kết khôi phục"}
              </button>
            </div>
            
            <div className="text-center mt-4">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-brand transition">
                Quay lại Đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
