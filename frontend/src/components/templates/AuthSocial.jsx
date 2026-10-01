"use client";

import { useSyncExternalStore } from "react";
import { AppleLogo, FacebookLogo, GoogleLogo } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";

/** Các liên kết OAuth dùng cùng máy chủ API và quay lại trang xác thực sau khi hoàn tất. */
export default function AuthSocial() {
  const t = useTranslations();
  const search = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => "",
  );
  const oauthError = new URLSearchParams(search).get("oauth_error");
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  const authBase = `${apiBase}/api/v1/auth`;
  const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL || `${authBase}/google`;

  return (
    <div className="auth-social">
      <div className="auth-divider"><span>{t("auth.alternative")}</span></div>
      <div className="auth-social-options">
        <a href={googleUrl} className="auth-social-provider auth-google">
          <GoogleLogo aria-hidden size={23} weight="bold" />
          {t("auth.google")}
        </a>
        <a href={`${authBase}/apple`} className="auth-social-provider auth-apple">
          <AppleLogo aria-hidden size={23} weight="fill" />
          {t("auth.apple")}
        </a>
        <a href={`${authBase}/facebook`} className="auth-social-provider auth-facebook">
          <FacebookLogo aria-hidden size={23} weight="fill" />
          {t("auth.facebook")}
        </a>
      </div>
      {oauthError ? <p role="alert" className="auth-social-error">{t(oauthError === "not_configured" ? "auth.socialNotConfigured" : oauthError === "email_in_use" ? "auth.socialEmailInUse" : "auth.socialFailed")}</p> : null}
    </div>
  );
}
