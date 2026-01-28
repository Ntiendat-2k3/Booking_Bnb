import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import BootstrapClient from "./bootstrap-client";

export const metadata = { title: "Airbnb App", description: "User Page" };

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <Providers>
          <BootstrapClient />
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
