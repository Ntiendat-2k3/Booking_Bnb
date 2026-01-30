import SectionRow from "@/components/SectionRow";
import { serverGetJson } from "@/lib/serverApi";

async function getSection(city, limit = 8) {
  const q = new URLSearchParams({
    city,
    limit: String(limit),
    sort: "rating_desc",
  });
  const res = await serverGetJson("/api/v1/listings?" + q.toString());
  const items = res.data?.items || [];
  // If DB data differs by accents/city naming (or is missing for that city), fall back to global top-rated.
  if (items.length) return items;

  const fallbackQ = new URLSearchParams({
    limit: String(limit),
    sort: "rating_desc",
  });
  const fallback = await serverGetJson(
    "/api/v1/listings?" + fallbackQ.toString(),
  );
  return fallback.data?.items || [];
}

export default async function HomePage() {
  const hcm = await getSection("Hồ Chí Minh", 7);
  const seoul = await getSection("Seoul", 8);
  const vang = await getSection("Văn Giang", 6);

  return (
    <div className="space-y-10">
      <SectionRow title="Được khách yêu thích" items={hcm} />
      <SectionRow title="Còn phòng tại Seoul vào tháng tới" items={seoul} />
      <SectionRow title="Chỗ ở tại Huyện Văn Giang" items={vang} />
    </div>
  );
}
