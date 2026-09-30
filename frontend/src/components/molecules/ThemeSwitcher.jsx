"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { DEFAULT_THEME, THEME_OPTIONS } from "@/lib/constants";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const icons = { system: Desktop, light: Sun, dark: Moon };

/** Chờ hydrate để lựa chọn đã lưu không làm lệch HTML từ máy chủ. */
export default function ThemeSwitcher({ compact = false }) {
  const { theme, setTheme, forcedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const t = useTranslations();
  const selected = mounted ? theme || DEFAULT_THEME : DEFAULT_THEME;
  const Icon = icons[selected] || Desktop;

  return (
    <label className={compact ? "relative inline-flex h-11 w-11 shrink-0" : "inline-flex max-w-full"}>
      <span className="sr-only">{t("theme.label")}</span>
      <select
        aria-label={t("theme.label")}
        title={`${t("theme.label")}: ${t(`theme.${selected}`)}`}
        value={selected}
        disabled={!mounted || !!forcedTheme}
        onChange={(event) => setTheme(event.target.value)}
        className={compact
          ? "h-11 w-11 cursor-pointer appearance-none rounded-full border border-line bg-surface text-transparent transition hover:bg-muted-surface disabled:cursor-wait disabled:opacity-50"
          : "field-control w-auto cursor-pointer"}
      >
        {THEME_OPTIONS.map(({ value, labelKey }) => <option key={value} value={value} className="bg-surface text-base text-ink">{t(labelKey)}</option>)}
      </select>
      {compact ? <Icon aria-hidden size={20} className="pointer-events-none absolute inset-0 m-auto text-ink" /> : null}
    </label>
  );
}
