"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginLocal } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, EnvelopeSimple, LockKey } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import AuthTemplate from "@/components/templates/AuthTemplate";
import InputField from "@/components/atoms/InputField";
import Button from "@/components/atoms/Button";
import PasswordField from "@/components/molecules/PasswordField";
import AuthSocial from "@/components/templates/AuthSocial";

const REMEMBERED_EMAIL_KEY = "booking-remembered-email";

function readRememberedEmail() {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || ""; }
  catch { return ""; }
}

export default function LoginPage() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, status, isInitialized, error } = useSelector((s) => s.auth);
  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(readRememberedEmail()));
  const busy = status === "loading";
  useEffect(() => { if (isInitialized && user && !busy) router.replace("/"); }, [isInitialized, user, busy, router]);
  async function onSubmit(event) {
    event.preventDefault();
    const ok = await dispatch(loginLocal({ email, password }));
    if (ok) {
      try {
        if (rememberEmail) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        // Lưu email là tùy chọn, không được cản trở đăng nhập thành công.
      }
      router.push("/");
    }
  }
  return (
    <AuthTemplate title={t("auth.welcome")} description={t("auth.welcomeDescription")} coverAlt={t("auth.coverAlt")} homeLabel={t("common.backHome")}>
      <form onSubmit={onSubmit} className="auth-form">
        <InputField className="auth-field" label={t("auth.email")} prefix={<EnvelopeSimple size={21} />} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.emailPlaceholder")} required disabled={busy} />
        <PasswordField className="auth-field" label={t("auth.password")} prefix={<LockKey size={21} />} placeholder={t("auth.passwordPlaceholder")} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
        <div className="auth-form-options">
          <label className="auth-check"><input type="checkbox" checked={rememberEmail} onChange={(e) => {
            setRememberEmail(e.target.checked);
            if (!e.target.checked) {
              try { window.localStorage.removeItem(REMEMBERED_EMAIL_KEY); }
              catch { /* Trình duyệt có thể chặn bộ nhớ cục bộ. */ }
            }
          }} disabled={busy} /><span>{t("auth.rememberEmail")}</span></label>
          <Link href="/forgot-password" className="auth-link">{t("auth.forgot")}</Link>
        </div>
        {error ? <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error === "auth.loginFailed" ? t(error) : error}</p> : null}
        <Button type="submit" loading={busy} className="auth-submit w-full">{t(busy ? "auth.loggingIn" : "auth.loginTitle")}<ArrowRight aria-hidden size={21} /></Button>
      </form>
      <AuthSocial />
      <p className="auth-switch">{t("auth.noAccount")} <Link href="/register" className="auth-link">{t("auth.signUpNow")}</Link></p>
    </AuthTemplate>
  );
}
