export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/host",
          "/account",
          "/profile",
          "/trips",
          "/favorites",
        ],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
