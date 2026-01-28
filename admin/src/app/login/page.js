"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // ensure CSRF cookie exists (for refresh/logout)
      await apiFetch("/api/v1/auth/csrf", { method: "GET" });

      await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // verify admin role using access cookie
      const me = await apiFetch("/api/v1/auth/profile", { method: "GET" });

      if (me.data?.role !== "admin") {
        setError("Tài khoản không có quyền admin.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
    } catch (e2) {
      setError(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-zinc-600">Đăng nhập tài khoản có role = admin</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm">Email</label>
            <input className="w-full rounded-md border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Mật khẩu</label>
            <input className="w-full rounded-md border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-3 py-2 text-white disabled:opacity-60">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
