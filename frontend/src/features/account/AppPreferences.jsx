"use client";
import { Moon, CurrencyDollar } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import LocaleSwitcher from "@/components/molecules/LocaleSwitcher";

export default function AppPreferences() {
  const t = useTranslations();
  return <section className="rounded-2xl border border-line bg-surface p-5 sm:p-8">
    <h2 className="text-xl font-bold text-ink">{t("account.preferences")}</h2>
    <p className="mt-2 text-sm text-muted-ink">{t("preferences.description")}</p>
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><p className="font-semibold">{t("locale.label")}</p><LocaleSwitcher /></div>
      <div className="flex items-start gap-4 border-t border-line pt-6"><CurrencyDollar aria-hidden size={24} /><div><p className="font-semibold">{t("preferences.currency")}</p><p className="mt-1 text-sm text-muted-ink">{t("preferences.currencyHint")}</p></div></div>
      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6"><Moon aria-hidden size={24} /><div className="min-w-0 flex-1"><p className="font-semibold">{t("preferences.darkMode")}</p><p className="mt-1 text-sm text-muted-ink">{t("preferences.darkDescription")}</p></div><span className="text-sm text-muted-ink">{t("preferences.comingSoon")}</span></div>
    </div>
  </section>;
}
