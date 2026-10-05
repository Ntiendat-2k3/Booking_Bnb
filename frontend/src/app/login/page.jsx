"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";
import { linkGoogleAccount, loginLocal } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, EnvelopeSimple, LockKey } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import AuthTemplate from "@/components/templates/AuthTemplate";
import InputField from "@/components/atoms/InputField";
import Button from "@/components/atoms/Button";
import PasswordField from "@/components/molecules/PasswordField";
import AuthSocial from "@/components/templates/AuthSocial";
import AlternativeLogin from "@/components/auth/AlternativeLogin";
import { afterLoginPath } from "@/lib/passkey";
import { serverFieldErrors, validateIdentifier, validateLoginPassword } from "@/lib/authValidation";

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
  const { user, status, isInitialized } = useSelector((s) => s.auth);
  const search = useSyncExternalStore(() => () => {}, () => window.location.search, () => "");
  const googleLink = new URLSearchParams(search).get("google_link") === "1";
  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(readRememberedEmail()));
  const busy = status === "loading";
  useEffect(() => { if (isInitialized && user && !busy && !googleLink) router.replace(afterLoginPath()); }, [isInitialized, user, busy, googleLink, router]);
  async function onSubmit(event) {
    event.preventDefault();
    const errors = { email: validateIdentifier(email), password: validateLoginPassword(password) };
    setFieldErrors(errors);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return;
    const identifier = email.trim();
    const result = await dispatch(googleLink
      ? linkGoogleAccount({ email: identifier, password })
      : loginLocal({ email: identifier, password }));
    if (result.ok) {
      try {
        if (rememberEmail) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, identifier);
        else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        // Lưu email là tùy chọn, không được cản trở đăng nhập thành công.
      }
      window.sessionStorage.setItem("booking-passkey-offer", "1");
      router.push(afterLoginPath());
    } else {
      const errorsFromServer = serverFieldErrors(result.invalidFields || [], {
        email: "auth.validation.identifierFormat", password: "auth.validation.invalidField",
      });
      setFieldErrors(errorsFromServer);
      if (!Object.keys(errorsFromServer).length) {
        setFormError(result.invalidCredentials ? "auth.invalidCredentials" : "auth.loginFailed");
      }
    }
  }
  return (
    <AuthTemplate title={t("auth.welcome")} description={t("auth.welcomeDescription")} coverAlt={t("auth.coverAlt")} homeLabel={t("common.backHome")}>
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        {googleLink ? <p role="status" className="text-sm text-muted-ink">{t("auth.googleLinkPrompt")}</p> : null}
        <InputField className="auth-field" label={t("auth.loginIdentifier")} prefix={<EnvelopeSimple size={21} />} type="text" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((current) => ({ ...current, email: null })); setFormError(""); }} error={fieldErrors.email ? t(fieldErrors.email) : null} placeholder={t("auth.loginIdentifierPlaceholder")} required disabled={busy} />
        <PasswordField className="auth-field" label={t("auth.password")} prefix={<LockKey size={21} />} placeholder={t("auth.passwordPlaceholder")} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((current) => ({ ...current, password: null })); setFormError(""); }} error={fieldErrors.password ? t(fieldErrors.password) : null} required disabled={busy} />
        <div className="auth-form-options">
          <label className="auth-check"><input type="checkbox" checked={rememberEmail} onChange={(e) => {
            setRememberEmail(e.target.checked);
            if (!e.target.checked) {
              try { window.localStorage.removeItem(REMEMBERED_EMAIL_KEY); }
              catch { /* Trình duyệt có thể chặn bộ nhớ cục bộ. */ }
            }
          }} disabled={busy} /><span>{t("auth.rememberLogin")}</span></label>
          <Link href="/forgot-password" className="auth-link">{t("auth.forgot")}</Link>
        </div>
        {formError ? <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{t(formError)}</p> : null}
        <Button type="submit" loading={busy} className="auth-submit w-full">{t(busy ? "auth.loggingIn" : googleLink ? "auth.linkGoogle" : "auth.loginTitle")}<ArrowRight aria-hidden size={21} /></Button>
      </form>
      <AuthSocial />
      {!googleLink ? <AlternativeLogin /> : null}
      <p className="auth-switch">{t("auth.noAccount")} <Link href="/register" className="auth-link">{t("auth.signUpNow")}</Link></p>
    </AuthTemplate>
  );
}
