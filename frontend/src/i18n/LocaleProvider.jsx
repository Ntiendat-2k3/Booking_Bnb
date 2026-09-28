"use client";

import { createContext, useContext, useMemo } from "react";
import { translate } from "./config";

const LocaleContext = createContext(null);

export function LocaleProvider({ locale, messages, children }) {
  const value = useMemo(
    () => ({
      locale,
      messages,
      t: (key, values) => translate(messages, key, values),
    }),
    [locale, messages],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale phải được dùng bên trong LocaleProvider");
  }
  return context;
}

export function useTranslations() {
  return useLocale().t;
}
