import { Suspense } from "react";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/organisms/Navbar";
import BootstrapClient from "./bootstrap-client";
import Container from "@/components/layout/Container";
import { ThemeProvider } from "next-themes";
import { DEFAULT_THEME } from "@/lib/constants";
import Footer from "@/components/organisms/Footer";
import { getServerTranslator } from "@/i18n/server";

const beVietnamPro = localFont({
  src: [
    {
      path: "../../public/fonts/be-vietnam-pro/BeVietnamPro-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/be-vietnam-pro/BeVietnamPro-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/be-vietnam-pro/BeVietnamPro-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/be-vietnam-pro/BeVietnamPro-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

export async function generateMetadata() {
  const { locale, t } = await getServerTranslator();
  const siteName = t("seo.siteName");
  const description = t("seo.defaultDescription");

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
    ),
    title: {
      default: t("seo.defaultTitle"),
      template: `%s | ${siteName}`,
    },
    icons: {
      icon: "/favicon.png",
      apple: "/apple-icon.png",
    },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title: siteName,
      description,
      type: "website",
      locale: locale === "en" ? "en_US" : "vi_VN",
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function RootLayout({ children }) {
  const { locale, messages } = await getServerTranslator();

  return (
    <html
      lang={locale === "en" ? "en" : "vi"}
      data-scroll-behavior="smooth"
      className={beVietnamPro.variable}
      suppressHydrationWarning
    >
      <body className="bg-canvas font-sans text-ink antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme={DEFAULT_THEME}
          enableSystem
          enableColorScheme
          disableTransitionOnChange
          storageKey="booking-theme"
        >
          <Providers locale={locale} messages={messages}>
            <BootstrapClient />
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            <main id="main-content" className="min-h-[calc(100dvh-140px)] py-6 sm:py-8">
              <Container>{children}</Container>
            </main>
            <Footer />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
