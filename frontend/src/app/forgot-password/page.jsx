"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { useTranslations } from "@/i18n/LocaleProvider";
import AuthTemplate from "@/components/templates/AuthTemplate";
import InputField from "@/components/atoms/InputField";
import Button from "@/components/atoms/Button";
import { serverFieldErrors, validateEmail, validationFields } from "@/lib/authValidation";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [fieldError, setFieldError] = useState("");
  const [formError, setFormError] = useState("");
  async function handleSubmit(event) {
    event.preventDefault();
    const error = validateEmail(email);
    setFieldError(error);
    setFormError("");
    if (error) return;
    setStatus("loading");
    try { await apiFetch("/api/v1/auth/forgot-password", { method: "POST", body: { email: email.trim() } }); setStatus("success"); }
    catch (err) {
      setStatus("error");
      const errors = serverFieldErrors(validationFields(err), { email: "auth.validation.emailFormat" });
      setFieldError(errors.email || "");
      if (!errors.email) setFormError("auth.requestFailed");
    }
  }
  return (
    <AuthTemplate title={t("auth.forgot")} description={t("auth.forgotDescription")} coverAlt={t("auth.coverAlt")} homeLabel={t("common.backHome")}>
      {status === "success" ? <div role="status" className="rounded-xl bg-positive/10 p-5 text-positive"><CheckCircle aria-hidden size={28} /><p className="mt-3 text-sm leading-6">{t("auth.resetEmailSent")}</p></div> :
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <InputField label={t("auth.email")} type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldError(""); setFormError(""); }} error={fieldError ? t(fieldError) : null} required disabled={status === "loading"} />
          {formError ? <p role="alert" className="text-sm text-danger">{t(formError)}</p> : null}
          <Button type="submit" loading={status === "loading"} className="w-full">{t(status === "loading" ? "auth.sending" : "auth.sendReset")}</Button>
        </form>}
      <Link href="/login" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">{t("auth.backLogin")}</Link>
    </AuthTemplate>
  );
}
