"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginLocal } from "@/store/authThunks";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const status = useSelector((s) => s.auth.status);
  const error = useSelector((s) => s.auth.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const googleUrl =
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL ||
    "http://localhost:3000/api/v1/auth/google";

  async function onSubmit(e) {
    e.preventDefault();
    const ok = await dispatch(loginLocal({ email, password }));
    if (ok) router.push("/");
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Đăng nhập</h1>

      <form onSubmit={onSubmit} className="p-4 space-y-3 border rounded-lg">
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full px-3 py-2 border rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Mật khẩu</label>
          <input
            className="w-full px-3 py-2 border rounded-md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          disabled={status === "loading"}
          className="w-full px-3 py-2 text-white rounded-md bg-slate-900 disabled:opacity-60"
        >
          {status === "loading" ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <a
          href={googleUrl}
          className="block w-full px-3 py-2 text-center border rounded-md hover:bg-slate-50"
        >
          Đăng nhập bằng Google
        </a>
      </form>
    </div>
  );
}
