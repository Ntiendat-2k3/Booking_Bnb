import { serverGetJson } from "@/lib/serverApi";

export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
  const base = siteUrl.replace(/\/$/, "");

  const staticRoutes = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    { path: "/search", priority: 0.9, changeFrequency: "daily" },
    { path: "/login", priority: 0.3, changeFrequency: "yearly" },
    { path: "/register", priority: 0.3, changeFrequency: "yearly" },
    { path: "/host", priority: 0.7, changeFrequency: "monthly" },
  ].map((r) => ({
    url: `${base}${r.path}`,
    lastModified: new Date(),
    priority: r.priority,
    changeFrequency: r.changeFrequency,
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
        priority: 0.8,
        changeFrequency: "weekly",
      }));

    return [...staticRoutes, ...listingRoutes];
  } catch {
    return staticRoutes;
  }
}
