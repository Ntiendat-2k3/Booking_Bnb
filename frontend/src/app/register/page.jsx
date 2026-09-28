"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerLocal } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "@/i18n/LocaleProvider";
import AuthTemplate from "@/components/templates/AuthTemplate";
import InputField from "@/components/atoms/InputField";
import Button from "@/components/atoms/Button";
import PasswordField from "@/components/molecules/PasswordField";

export default function RegisterPage() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, status, isInitialized, error } = useSelector((s) => s.auth);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const busy = status === "loading";
  useEffect(() => { if (isInitialized && user && !busy) router.replace("/profile"); }, [isInitialized, user, busy, router]);
  async function onSubmit(event) {
    event.preventDefault();
    const ok = await dispatch(registerLocal({ email, password, full_name: fullName }));
    if (ok) router.push("/profile");
  }
  return (
    <AuthTemplate title={t("auth.registerTitle")} description={t("auth.registerDescription")} coverTitle={t("auth.startJourney")} coverDescription={t("auth.joinDescription")} coverAlt={t("auth.coverAlt")}>
      <form onSubmit={onSubmit} className="space-y-5">
        <InputField label={t("auth.fullName")} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("auth.namePlaceholder")} required disabled={busy} />
        <InputField label={t("auth.email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} required disabled={busy} />
        <PasswordField label={t("auth.password")} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
        {error ? <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error === "auth.registerFailed" ? t(error) : error}</p> : null}
        <p className="text-xs leading-6 text-muted-ink">{t("auth.agreement")}</p>
        <Button type="submit" loading={busy} className="w-full">{t(busy ? "auth.creating" : "auth.register")}</Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-ink">{t("auth.hasAccount")} <Link href="/login" className="font-semibold text-brand underline">{t("auth.loginNow")}</Link></p>
    </AuthTemplate>
  );
}
