"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useTranslations } from "@/i18n/LocaleProvider";
import AuthTemplate from "@/components/templates/AuthTemplate";
import PasswordField from "@/components/molecules/PasswordField";
import Button from "@/components/atoms/Button";

function ResetPasswordContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  useEffect(() => {
    if (status !== "success") return;
    const timeout = setTimeout(() => router.push("/login"), 3000);
    return () => clearTimeout(timeout);
  }, [status, router]);
  async function handleSubmit(event) {
    event.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) { setError("auth.passwordMismatch"); return; }
    setStatus("loading"); setError("");
    try { await apiFetch("/api/v1/auth/reset-password", { method: "POST", body: { token, newPassword: password } }); setStatus("success"); }
    catch (err) { setStatus("error"); setError(err.message || "auth.resetFailed"); }
  }
  return (
    <AuthTemplate title={t("auth.resetTitle")} description={t("auth.resetDescription")} coverAlt={t("auth.coverAlt")} homeLabel={t("common.backHome")}>
      {!token ? <div role="alert" className="space-y-4"><p className="text-danger">{t("auth.invalidLink")}</p><Link className="inline-flex min-h-11 items-center font-semibold text-brand underline" href="/forgot-password">{t("auth.requestNewLink")}</Link></div> : status === "success" ?
        <div role="status" className="rounded-xl bg-positive/10 p-5 text-positive"><p>{t("auth.passwordReset")}</p><p className="mt-3 text-sm">{t("auth.redirectLogin")}</p></div> :
        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordField label={t("auth.newPassword")} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={status === "loading"} />
          <PasswordField label={t("auth.confirmPassword")} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={status === "loading"} />
          {error ? <p role="alert" className="text-sm text-danger">{error.startsWith("auth.") ? t(error) : error}</p> : null}
          <Button type="submit" loading={status === "loading"} className="w-full">{t("auth.savePassword")}</Button>
        </form>}
    </AuthTemplate>
  );
}
export default function ResetPasswordPage() {
  const t = useTranslations();
  return <Suspense fallback={<p role="status">{t("common.loading")}</p>}><ResetPasswordContent /></Suspense>;
}
