"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerLocal } from "@/store/authThunks";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const status = useSelector((s) => s.auth.status);
  const error = useSelector((s) => s.auth.error);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    const ok = await dispatch(registerLocal({ email, password, full_name: fullName }));
    if (ok) router.push("/profile");
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Đăng ký</h1>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <div className="space-y-1">
          <label className="text-sm">Họ tên</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Mật khẩu</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          disabled={status === "loading"}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-white disabled:opacity-60"
        >
          {status === "loading" ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </form>
    </div>
  );
}
