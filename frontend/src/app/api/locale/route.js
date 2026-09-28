import { NextResponse } from "next/server";
import {
  LOCALE_COOKIE,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from "@/i18n/config";

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const requestedLocale = payload?.locale;

  if (!SUPPORTED_LOCALES.includes(requestedLocale)) {
    return NextResponse.json(
      { message: "Unsupported locale" },
      { status: 400 },
    );
  }

  const locale = normalizeLocale(requestedLocale);
  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
