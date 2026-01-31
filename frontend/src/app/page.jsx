import SectionRow from "@/components/SectionRow";
import { serverGetJson } from "@/lib/serverApi";

async function getSection({ city, limit = 8, sort = "rating_desc" }) {
  const q = new URLSearchParams({
    ...(city ? { city } : {}),
    limit: String(limit),
    sort,
  });
  const res = await serverGetJson("/api/v1/listings?" + q.toString());
  const items = res.data?.items || [];

  // If the section is city-based but the DB city naming differs (accents, etc.), fall back to global list.
  if (!city || items.length) return items;

  const fallbackQ = new URLSearchParams({ limit: String(limit), sort });
  const fallback = await serverGetJson("/api/v1/listings?" + fallbackQ.toString());
  return fallback.data?.items || [];
}

const SECTION_CONFIG = [
  // 1) A global section so users can discover rooms without searching.
  { title: "Gợi ý cho bạn", limit: 12 },

  // 2) City-based sections (easy to add/remove without copy-paste).
  { title: "Được khách yêu thích tại Hồ Chí Minh", city: "Hồ Chí Minh", limit: 10 },
  { title: "Chỗ ở nổi bật tại Hà Nội", city: "Hà Nội", limit: 10 },
  { title: "Trốn nóng ở Đà Nẵng", city: "Đà Nẵng", limit: 10 },
  { title: "Chỗ ở tại Huyện Văn Giang", city: "Văn Giang", limit: 10 },
  { title: "Còn phòng tại Seoul vào tháng tới", city: "Seoul", limit: 10 },
];

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
