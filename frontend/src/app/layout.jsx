import "./globals.css";
import "simple-notify/dist/simple-notify.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import CategoryTabs from "@/components/CategoryTabs";
import BootstrapClient from "./bootstrap-client";

export const metadata = { title: "Airbnb App", description: "User Page" };

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <Providers>
          <BootstrapClient />
          <Navbar />
          <CategoryTabs />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
