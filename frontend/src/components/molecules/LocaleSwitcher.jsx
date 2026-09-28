"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlobeHemisphereWest } from "@phosphor-icons/react";
import { useLocale } from "@/i18n/LocaleProvider";
import { notifyError } from "@/lib/notify";

export default function LocaleSwitcher({ compact = false }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const nextLocale = locale === "vn" ? "en" : "vn";
  const label = t(nextLocale === "en" ? "locale.switchToEnglish" : "locale.switchToVietnamese");
  async function changeLocale() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: nextLocale }) });
      if (!response.ok) throw new Error("locale");
      router.refresh();
    } catch { notifyError(t("locale.changeFailed")); }
    finally { setPending(false); }
  }
  return <button type="button" onClick={changeLocale} disabled={pending} aria-busy={pending} aria-label={label} title={label} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink transition hover:bg-muted-surface disabled:opacity-50">
    <GlobeHemisphereWest aria-hidden size={20} />
    {compact ? null : <span>{t(locale === "vn" ? "locale.vietnamese" : "locale.english")}</span>}
  </button>;
}
