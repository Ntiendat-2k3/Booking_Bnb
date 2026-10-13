import en from "./en.json";
import vn from "./vn.json";

export const DEFAULT_LOCALE = "vn";
export const LOCALE_COOKIE = "booking_locale";
export const SUPPORTED_LOCALES = ["vn", "en"];

const dictionaries = { en, vn };

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function getDictionary(locale) {
  return dictionaries[normalizeLocale(locale)];
}
