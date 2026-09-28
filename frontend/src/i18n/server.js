import { cookies } from "next/headers";
import {
  createTranslator,
  getDictionary,
  LOCALE_COOKIE,
  normalizeLocale,
} from "./config";

export async function getLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

export async function getServerTranslator() {
  const locale = await getLocale();
  return {
    locale,
    messages: getDictionary(locale),
    t: createTranslator(locale),
  };
}
