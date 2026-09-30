import en from "./en.json";
import vn from "./vn.json";
import { translate } from "./translate";

export { translate } from "./translate";

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

export function createTranslator(locale) {
  const messages = getDictionary(locale);
  return (key, values) => translate(messages, key, values);
}
