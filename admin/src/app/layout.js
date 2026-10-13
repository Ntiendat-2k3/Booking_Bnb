import "./globals.css";
import SonnerToaster from "@/components/organisms/SonnerToaster";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { getServerLocale } from "@/i18n/server";
import { ThemeProvider } from "next-themes";

export async function generateMetadata() {
  const { messages } = await getServerLocale();
  return {
    title: messages.meta.title,
    description: messages.meta.description,
    icons: { icon: "/favicon.png" },
  };
}

export default async function RootLayout({ children }) {
  const { locale, messages } = await getServerLocale();
  return (
    <html lang={locale === "vn" ? "vi" : "en"} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem enableColorScheme disableTransitionOnChange storageKey="booking-theme">
          <LocaleProvider locale={locale} messages={messages}>
            <SonnerToaster />
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
