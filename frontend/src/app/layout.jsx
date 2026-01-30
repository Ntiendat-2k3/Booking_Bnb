import "./globals.css";
import "simple-notify/dist/simple-notify.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import CategoryTabs from "@/components/CategoryTabs";
import BootstrapClient from "./bootstrap-client";
import Container from "@/components/layout/Container";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
  ),
  title: {
    default: "Booking BnB",
    template: "%s | Booking BnB",
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
          <BootstrapClient />
          <Navbar />
          <CategoryTabs />
          <main className="py-6">
            <Container>{children}</Container>
          </main>
        </Providers>
      </body>
    </html>
  );
}
