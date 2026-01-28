"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setTokens, setUser } from "@/store/authSlice";
import { saveAuthStorage } from "@/store/storage";
import { fetchProfile } from "@/store/authThunks";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (accessToken && refreshToken) {
      dispatch(setTokens({ accessToken, refreshToken }));
      saveAuthStorage({ accessToken, refreshToken });
      dispatch(fetchProfile()).finally(() => router.replace("/profile"));
    } else {
      dispatch(setUser(null));
      router.replace("/login");
    }
  }, [dispatch, params, router]);

  return <div className="mx-auto max-w-md rounded-lg border p-4">Đang xử lý đăng nhập...</div>;
}
