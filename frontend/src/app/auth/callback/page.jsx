"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


import { useEffect, Suspense } from "react";
import { useDispatch } from "react-redux";
import { refreshSession, fetchProfile, ensureCsrf } from "@/store/authThunks";
import { useRouter, useSearchParams } from "next/navigation";
import { afterLoginPath } from "@/lib/passkey";

function AuthCallbackContent() {
  const t = useTranslations();
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
          window.sessionStorage.setItem("booking-passkey-offer", "1");
          router.replace(afterLoginPath());
          return;
        }
      } catch {}
      router.replace("/login");
    }

    run();
  }, [dispatch, params, router]);

  return <div className="mx-auto max-w-md rounded-lg border p-4">{t("auth.processing")}</div>;
}

export default function AuthCallbackPage() {
  const t = useTranslations();
  return (
    <Suspense fallback={<div className="mx-auto max-w-md rounded-lg border p-4">{t("auth.processing")}</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
