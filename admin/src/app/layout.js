import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SonnerToaster from "@/components/ui/SonnerToaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BnB Admin Console",
  description: "Administration dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SonnerToaster />
        {children}
      </body>
    </html>
  );
}
