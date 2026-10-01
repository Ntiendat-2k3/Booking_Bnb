"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerLocal } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, EnvelopeSimple, LockKey, User } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import AuthTemplate from "@/components/templates/AuthTemplate";
import InputField from "@/components/atoms/InputField";
import Button from "@/components/atoms/Button";
import PasswordField from "@/components/molecules/PasswordField";
import AuthSocial from "@/components/templates/AuthSocial";

export default function RegisterPage() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, status, isInitialized, error } = useSelector((s) => s.auth);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const busy = status === "loading";
  useEffect(() => { if (isInitialized && user && !busy) router.replace("/profile"); }, [isInitialized, user, busy, router]);
  async function onSubmit(event) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setPasswordError(t("auth.passwordMismatch"));
      return;
    }
    const ok = await dispatch(registerLocal({ email, password, full_name: fullName }));
    if (ok) router.push("/profile");
  }
  return (
    <AuthTemplate title={t("auth.registerTitle")} description={t("auth.registerDescription")} coverAlt={t("auth.coverAlt")} homeLabel={t("common.backHome")}>
      <form onSubmit={onSubmit} className="auth-form">
        <InputField className="auth-field" label={t("auth.fullName")} prefix={<User size={21} />} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("auth.namePlaceholder")} required disabled={busy} />
        <InputField className="auth-field" label={t("auth.email")} prefix={<EnvelopeSimple size={21} />} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} required disabled={busy} />
        <PasswordField className="auth-field" label={t("auth.password")} prefix={<LockKey size={21} />} placeholder={t("auth.createPasswordPlaceholder")} autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }} required disabled={busy} />
        <PasswordField className="auth-field" label={t("auth.confirmPassword")} prefix={<LockKey size={21} />} placeholder={t("auth.confirmPasswordPlaceholder")} autoComplete="new-password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }} error={passwordError} required disabled={busy} />
        <label className="auth-check auth-agreement"><input type="checkbox" required disabled={busy} /><span>{t("auth.agreement")}</span></label>
        {error ? <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error === "auth.registerFailed" ? t(error) : error}</p> : null}
        <Button type="submit" loading={busy} className="auth-submit w-full">{t(busy ? "auth.creating" : "auth.register")}<ArrowRight aria-hidden size={21} /></Button>
      </form>
      <AuthSocial />
      <p className="auth-switch">{t("auth.hasAccount")} <Link href="/login" className="auth-link">{t("auth.loginNow")}</Link></p>
    </AuthTemplate>
  );
}
