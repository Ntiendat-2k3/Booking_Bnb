import { cookies } from "next/headers";
import { getDictionary, LOCALE_COOKIE, normalizeLocale } from "./config";

export async function getServerLocale() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return { locale, messages: getDictionary(locale) };
}
