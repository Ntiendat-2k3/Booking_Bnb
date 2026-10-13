"use client";

import { useTranslations } from "@/i18n/LocaleProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setManualCsrfToken } from "@/lib/api";
import { isAdminRole } from "@/lib/roles";
import Input from "@/components/atoms/Input";
import Button from "@/components/atoms/Button";
import { toast } from "sonner";
import { Mountain } from "lucide-react";
import LocaleSwitcher from "@/components/molecules/LocaleSwitcher";
import ThemeSwitcher from "@/components/molecules/ThemeSwitcher";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Lấy CSRF token trước khi tạo phiên đăng nhập.
      const csrfRes = await apiFetch("/api/v1/auth/csrf", { method: "GET" });
      if (csrfRes.data?.csrfToken || csrfRes.csrfToken) {
        setManualCsrfToken(csrfRes.data?.csrfToken || csrfRes.csrfToken);
      }

      await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Chỉ tài khoản admin và super_admin mới được vào bảng điều khiển.
      const me = await apiFetch("/api/v1/auth/profile", { method: "GET" });

      if (!isAdminRole(me.data?.role)) {
        setError(t("login.noAccess"));
        setLoading(false);
        return;
      }

      toast.success(t("login.welcome"));
      router.replace("/dashboard/bookings");
    } catch (e2) {
      setError(e2?.message || t("login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] app-bg lg:grid-cols-[minmax(320px,42%)_minmax(0,1fr)]">
      <div className="flex min-h-52 flex-col justify-between bg-[var(--admin-forest-deep)] p-7 text-[#f7f4ed] sm:p-10 lg:min-h-[100dvh] lg:p-14">
        <div className="flex items-center gap-3">
          <Mountain className="h-9 w-9 text-[#c6a565]" strokeWidth={1.7} aria-hidden="true" />
          <span className="text-xl font-semibold tracking-[-0.05em]">Booking BnB</span>
        </div>
        <div className="max-w-lg pt-10 lg:pb-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#c6a565]">{t("nav.adminConsole")}</p>
          <p className="text-3xl font-medium leading-tight tracking-[-0.055em] sm:text-4xl lg:text-5xl">{t("login.heroTitle")}</p>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#cbd9c8]">{t("login.heroDescription")}</p>
        </div>
        <p className="hidden border-t border-[#405440] pt-5 text-xs text-[#a9bda9] lg:block">Booking BnB / {t("login.administration")}</p>
      </div>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="admin-overline">{t("login.secureAccess")}</p>
            <div className="flex items-center gap-2"><ThemeSwitcher /><LocaleSwitcher /></div>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.055em] text-[var(--admin-ink)]">{t("login.title")}</h1>
          <p className="mt-3 text-sm leading-6 ui-muted">{t("login.description")}</p>

          <form onSubmit={onSubmit} className="mt-9 space-y-5 border-t border-[var(--admin-line)] pt-8">
            <div className="space-y-2">
              <label htmlFor="admin-email" className="block text-sm font-semibold">{t("common.email")}</label>
              <Input id="admin-email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-password" className="block text-sm font-semibold">{t("login.password")}</label>
              <Input id="admin-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>

            {error ? <p role="alert" className="admin-danger-note px-4 py-3 text-sm">{error}</p> : null}

            <Button disabled={loading} variant="primary" className="mt-2 h-12 w-full">
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
