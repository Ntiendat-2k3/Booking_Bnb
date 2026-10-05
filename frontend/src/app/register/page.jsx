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
import { afterLoginPath } from "@/lib/passkey";
import { serverFieldErrors, validateConfirmation, validateEmail, validateFullName, validateNewPassword, validateUsername } from "@/lib/authValidation";

export default function RegisterPage() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, status, isInitialized } = useSelector((s) => s.auth);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const busy = status === "loading";
  useEffect(() => { if (isInitialized && user && !busy) router.replace(afterLoginPath()); }, [isInitialized, user, busy, router]);
  async function onSubmit(event) {
    event.preventDefault();
    const errors = {
      full_name: validateFullName(fullName),
      username: validateUsername(username),
      email: validateEmail(email),
      password: validateNewPassword(password),
      confirmPassword: validateConfirmation(confirmPassword, password),
      agreement: agreed ? null : "auth.validation.agreementRequired",
    };
    setFieldErrors(errors);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return;
    const result = await dispatch(registerLocal({ email: email.trim(), username: username.trim().toLowerCase(),
      password, full_name: fullName.trim() }));
    if (result.ok) {
      window.sessionStorage.setItem("booking-passkey-offer", "1");
      router.push(afterLoginPath());
    } else {
      const errorsFromServer = serverFieldErrors(result.invalidFields || [], {
        full_name: "auth.validation.nameLength",
        username: "auth.validation.usernameFormat",
        email: "auth.validation.emailFormat",
        password: "auth.validation.passwordLength",
      });
      if (result.conflictField === "email") errorsFromServer.email = "auth.validation.emailTaken";
      if (result.conflictField === "username") errorsFromServer.username = "auth.validation.usernameTaken";
      setFieldErrors(errorsFromServer);
      if (!Object.keys(errorsFromServer).length) setFormError("auth.registerFailed");
    }
  }
  return (
    <AuthTemplate title={t("auth.registerTitle")} description={t("auth.registerDescription")} coverAlt={t("auth.coverAlt")} homeLabel={t("common.backHome")}>
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        <InputField className="auth-field" label={t("auth.fullName")} prefix={<User size={21} />} autoComplete="name" value={fullName} onChange={(e) => { setFullName(e.target.value); setFieldErrors((current) => ({ ...current, full_name: null })); setFormError(""); }} error={fieldErrors.full_name ? t(fieldErrors.full_name) : null} placeholder={t("auth.namePlaceholder")} required disabled={busy} />
        <InputField className="auth-field" label={t("auth.username")} prefix={<User size={21} />} autoComplete="username" value={username} onChange={(e) => { setUsername(e.target.value.toLowerCase()); setFieldErrors((current) => ({ ...current, username: null })); setFormError(""); }} error={fieldErrors.username ? t(fieldErrors.username) : null} placeholder={t("auth.usernamePlaceholder")} pattern="[a-z0-9_]{3,40}" minLength={3} maxLength={40} required disabled={busy} />
        <InputField className="auth-field" label={t("auth.email")} prefix={<EnvelopeSimple size={21} />} type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((current) => ({ ...current, email: null })); setFormError(""); }} error={fieldErrors.email ? t(fieldErrors.email) : null} placeholder={t("auth.emailPlaceholder")} required disabled={busy} />
        <PasswordField className="auth-field" label={t("auth.password")} prefix={<LockKey size={21} />} placeholder={t("auth.createPasswordPlaceholder")} autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((current) => ({ ...current, password: null, confirmPassword: null })); setFormError(""); }} error={fieldErrors.password ? t(fieldErrors.password) : null} required disabled={busy} />
        <PasswordField className="auth-field" label={t("auth.confirmPassword")} prefix={<LockKey size={21} />} placeholder={t("auth.confirmPasswordPlaceholder")} autoComplete="new-password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((current) => ({ ...current, confirmPassword: null })); setFormError(""); }} error={fieldErrors.confirmPassword ? t(fieldErrors.confirmPassword) : null} required disabled={busy} />
        <div>
          <label className="auth-check auth-agreement"><input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setFieldErrors((current) => ({ ...current, agreement: null })); }} aria-invalid={Boolean(fieldErrors.agreement)} aria-describedby={fieldErrors.agreement ? "agreement-error" : undefined} required disabled={busy} /><span>{t("auth.agreement")}</span></label>
          {fieldErrors.agreement ? <p id="agreement-error" role="alert" className="mt-2 text-sm text-danger">{t(fieldErrors.agreement)}</p> : null}
        </div>
        {formError ? <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{t(formError)}</p> : null}
        <Button type="submit" loading={busy} className="auth-submit w-full">{t(busy ? "auth.creating" : "auth.register")}<ArrowRight aria-hidden size={21} /></Button>
      </form>
      <AuthSocial />
      <p className="auth-switch">{t("auth.hasAccount")} <Link href="/login" className="auth-link">{t("auth.loginNow")}</Link></p>
    </AuthTemplate>
  );
}
