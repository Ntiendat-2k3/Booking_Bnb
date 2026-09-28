"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginLocal } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleLogo } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import AuthTemplate from "@/components/templates/AuthTemplate";
import InputField from "@/components/atoms/InputField";
import Button from "@/components/atoms/Button";
import PasswordField from "@/components/molecules/PasswordField";

export default function LoginPage() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, status, isInitialized, error } = useSelector((s) => s.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const busy = status === "loading";
  useEffect(() => { if (isInitialized && user && !busy) router.replace("/"); }, [isInitialized, user, busy, router]);
  async function onSubmit(event) {
    event.preventDefault();
    const ok = await dispatch(loginLocal({ email, password }));
    if (ok) router.push("/");
  }
  const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL || "http://localhost:8000/api/v1/auth/google";
  return (
    <AuthTemplate title={t("auth.loginTitle")} description={t("auth.loginDescription")} coverTitle={t("auth.welcome")} coverDescription={t("auth.welcomeDescription")} coverAlt={t("auth.coverAlt")}>
      <form onSubmit={onSubmit} className="space-y-5">
        <InputField label={t("auth.email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} required disabled={busy} />
        <PasswordField label={t("auth.password")} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">{t("auth.forgot")}</Link>
        {error ? <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error === "auth.loginFailed" ? t(error) : error}</p> : null}
        <Button type="submit" loading={busy} className="w-full">{t(busy ? "auth.loggingIn" : "auth.loginTitle")}</Button>
      </form>
      <p className="my-6 text-center text-sm text-muted-ink">{t("auth.alternative")}</p>
      <a href={googleUrl} className="flex min-h-11 items-center justify-center gap-3 rounded-xl border border-line p-3 text-sm font-semibold hover:bg-muted-surface"><GoogleLogo aria-hidden size={20} />{t("auth.google")}</a>
      <p className="mt-8 text-center text-sm text-muted-ink">{t("auth.noAccount")} <Link href="/register" className="font-semibold text-brand underline">{t("auth.signUpNow")}</Link></p>
    </AuthTemplate>
  );
}
