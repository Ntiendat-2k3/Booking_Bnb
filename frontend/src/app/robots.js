export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/host/dashboard",
          "/host/listings",
          "/account",
          "/profile",
          "/trips",
          "/favorites",
          "/checkout",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
