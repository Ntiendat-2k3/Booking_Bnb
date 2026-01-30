import { serverGetJson } from "@/lib/serverApi";

export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const base = siteUrl.replace(/\/$/, "");

  const staticRoutes = ["", "/search"].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
  }));

  try {
    const res = await serverGetJson("/api/v1/listings?limit=200&sort=newest", {
      next: { revalidate: 3600 },
    });

    const ok = res?.status === "success" || res?.success === true;
    const items = ok ? res.data?.items || [] : [];

    const listingRoutes = items
      .filter((it) => it?.id)
      .map((it) => ({
        url: `${base}/rooms/${it.id}`,
        lastModified: new Date(it.updated_at || it.created_at || Date.now()),
      }));

    return [...staticRoutes, ...listingRoutes];
  } catch {
    return staticRoutes;
  }
}
