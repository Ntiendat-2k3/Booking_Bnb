import SectionRow from "@/components/SectionRow";
import { serverGetJson } from "@/lib/serverApi";
import { SECTION_CONFIG } from "@/lib/constants";

async function getSection({ city, limit = 8, sort = "rating_desc" }) {
  const q = new URLSearchParams({
    ...(city ? { city } : {}),
    limit: String(limit),
    sort,
  });

  try {
    // ISR: cache for 60 seconds instead of always-fresh
    const res = await serverGetJson("/api/v1/listings?" + q.toString(), {
      next: { revalidate: 60 },
    });
    const items = res.data?.items || [];

    if (!city || items.length) return items;

    const fallbackQ = new URLSearchParams({ limit: String(limit), sort });
    const fallback = await serverGetJson(
      "/api/v1/listings?" + fallbackQ.toString(),
      { next: { revalidate: 60 } },
    );
    return fallback.data?.items || [];
  } catch (error) {
    console.error("Failed to fetch section during prerendering:", error.message);
    return []; // fallback so build doesn't crash
  }
}

export default async function HomePage() {
  const sections = await Promise.all(
    SECTION_CONFIG.map(async (s) => ({
      ...s,
      items: await getSection(s),
    })),
  );

  return (
    <div className="space-y-10">
      {sections.map((s) => (
        <SectionRow key={s.title} title={s.title} items={s.items} city={s.city} />
      ))}
    </div>
  );
}
