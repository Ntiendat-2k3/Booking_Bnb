"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/i18n/LocaleProvider";

export default function LocaleSwitcher() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const nextLocale = locale === "vn" ? "en" : "vn";
  const label = t(nextLocale === "en" ? "locale.switchToEnglish" : "locale.switchToVietnamese");

  async function changeLocale() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      if (!response.ok) throw new Error("locale");
      router.refresh();
    } catch {
      toast.error(t("locale.changeFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={changeLocale} disabled={pending} aria-busy={pending} aria-label={label} title={label} className="inline-flex min-h-10 items-center gap-2 border border-[var(--admin-line)] px-3 text-xs font-semibold uppercase tracking-wide hover:bg-[var(--admin-canvas)] disabled:opacity-50">
      <Globe2 className="h-4 w-4" aria-hidden="true" />
      {locale === "vn" ? "VI" : "EN"}
    </button>
  );
}
