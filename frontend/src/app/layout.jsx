import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import CategoryTabs from "@/components/CategoryTabs";
import BootstrapClient from "./bootstrap-client";
import Container from "@/components/layout/Container";
import { Toaster } from "sonner";
import Footer from "@/components/Footer";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_LANG,
} from "@/lib/constants";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
  ),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
    languages: {
      "vi-VN": "/",
    },
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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
  verification: {
    // Add your Google Search Console verification here when ready
    // google: "your-verification-code",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang={SITE_LANG} className={inter.variable}>
      <body className="font-sans">
        <Providers>
          <Toaster richColors position="top-right" />
          <BootstrapClient />
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <Suspense fallback={null}>
            <CategoryTabs />
          </Suspense>
          <main className="py-6 min-h-[calc(100vh-140px)]">
            <Container>{children}</Container>
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
