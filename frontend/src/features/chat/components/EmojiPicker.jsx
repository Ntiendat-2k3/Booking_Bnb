"use client";

import data from "@emoji-mart/data/sets/15/apple.json";
import Picker from "@emoji-mart/react";
import { useTheme } from "next-themes";
import { useLocale } from "@/i18n/LocaleProvider";

export default function EmojiPicker({ onEmojiSelect }) {
  const { locale } = useLocale();
  const { resolvedTheme } = useTheme();

  return <div style={{
    "--rgb-color": "var(--color-ink)",
    "--rgb-accent": "var(--color-accent)",
    "--rgb-background": "var(--color-surface)",
    "--rgb-input": "var(--color-muted-surface)",
    "--color-border": "rgb(var(--color-line))",
  }}>
    <Picker data={data} set="apple" locale={locale === "vn" ? "vi" : "en"}
      theme={resolvedTheme === "dark" ? "dark" : "light"} onEmojiSelect={onEmojiSelect}
      previewPosition="none" skinTonePosition="search" perLine={7} />
  </div>;
}
