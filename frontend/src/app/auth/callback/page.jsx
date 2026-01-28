"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { refreshSession, fetchProfile, ensureCsrf } from "@/store/authThunks";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    const success = params.get("success");

    async function run() {
      try {
        await dispatch(ensureCsrf());
        if (success === "1") {
          // refresh cookie already set by backend -> rotate access cookie
          await dispatch(refreshSession());
          await dispatch(fetchProfile());
          router.replace("/profile");
          return;
        }
      } catch {}
      router.replace("/login");
    }

    run();
  }, [dispatch, params, router]);

  return <div className="mx-auto max-w-md rounded-lg border p-4">Đang xử lý đăng nhập...</div>;
}
