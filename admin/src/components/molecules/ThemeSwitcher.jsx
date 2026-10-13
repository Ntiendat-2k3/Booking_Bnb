"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import Select from "@/components/atoms/Select";
import { useTranslations } from "@/i18n/LocaleProvider";

const themeOptions = ["system", "light", "dark"];
const icons = { system: Monitor, light: Sun, dark: Moon };
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** Chờ hydrate trước khi hiện lựa chọn đã lưu để HTML từ máy chủ khớp với client. */
export default function ThemeSwitcher({ compact = false }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const t = useTranslations();
  const selected = mounted ? theme || "system" : "system";
  const Icon = icons[selected] || Monitor;

  return (
    <label className={compact ? "relative inline-flex shrink-0" : "inline-flex"}>
      <span className="sr-only">{t("theme.label")}</span>
      <Select
        aria-label={t("theme.label")}
        title={`${t("theme.label")}: ${t(`theme.${selected}`)}`}
        value={selected}
        disabled={!mounted}
        onChange={(event) => setTheme(event.target.value)}
        className={compact ? "admin-theme-compact w-10 cursor-pointer appearance-none px-0" : "w-auto cursor-pointer"}
      >
        {themeOptions.map((option) => (
          <option key={option} value={option} className="bg-[var(--admin-surface)] text-[var(--admin-ink)]">
            {t(`theme.${option}`)}
          </option>
        ))}
      </Select>
      {compact ? <Icon className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-[var(--admin-ink)]" aria-hidden="true" /> : null}
    </label>
  );
}
