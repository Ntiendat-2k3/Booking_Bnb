"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

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

      toast.success("Welcome back");
      router.replace("/dashboard");
    } catch (e2) {
      setError(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--background) p-4">
      <div className="w-full max-w-sm rounded-2xl border border-(--ui-border) bg-(--ui-panel) p-6 shadow-sm">
        <h1 className="text-xl font-semibold">BnB Admin Console</h1>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-(--ui-muted)">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-(--ui-muted)">Mật khẩu</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button disabled={loading} variant="primary" className="w-full">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </div>
    </div>
  );
}
