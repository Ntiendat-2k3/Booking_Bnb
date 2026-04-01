import { Suspense } from "react";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import CategoryTabs from "@/components/CategoryTabs";
import BootstrapClient from "./bootstrap-client";
import Container from "@/components/layout/Container";
import { Toaster } from "sonner";
import Footer from "@/components/Footer";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
  ),
  title: {
    default: "Booking BnB",
    template: "%s | Booking BnB",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  description:
    "Đặt phòng nhanh, tìm chỗ ở theo thành phố, giá, và vị trí gần bạn.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Booking BnB",
    description:
      "Đặt phòng nhanh, tìm chỗ ở theo thành phố, giá, và vị trí gần bạn.",
    type: "website",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Booking BnB",
    description:
      "Đặt phòng nhanh, tìm chỗ ở theo thành phố, giá, và vị trí gần bạn.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
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
