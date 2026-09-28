"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { useTranslations } from "@/i18n/LocaleProvider";
import AuthTemplate from "@/components/templates/AuthTemplate";
import InputField from "@/components/atoms/InputField";
import Button from "@/components/atoms/Button";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading"); setError("");
    try { await apiFetch("/api/v1/auth/forgot-password", { method: "POST", body: { email } }); setStatus("success"); }
    catch (err) { setStatus("error"); setError(err.message || "auth.requestFailed"); }
  }
  return (
    <AuthTemplate title={t("auth.forgot")} description={t("auth.forgotDescription")} coverAlt={t("auth.coverAlt")}>
      {status === "success" ? <div role="status" className="rounded-xl bg-positive/10 p-5 text-positive"><CheckCircle aria-hidden size={28} /><p className="mt-3 text-sm leading-6">{t("auth.resetEmailSent")}</p></div> :
        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField label={t("auth.email")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={status === "loading"} />
          {error ? <p role="alert" className="text-sm text-danger">{error === "auth.requestFailed" ? t(error) : error}</p> : null}
          <Button type="submit" loading={status === "loading"} className="w-full">{t(status === "loading" ? "auth.sending" : "auth.sendReset")}</Button>
        </form>}
      <Link href="/login" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">{t("auth.backLogin")}</Link>
    </AuthTemplate>
  );
}
