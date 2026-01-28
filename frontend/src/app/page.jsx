import SectionRow from "@/components/SectionRow";
import { serverGetJson } from "@/lib/serverApi";

async function getSection(city, limit = 8) {
  const q = new URLSearchParams({ city, limit: String(limit), sort: "rating_desc" });
  const res = await serverGetJson("/api/v1/listings?" + q.toString());
  return res.data?.items || [];
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

      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-lg font-semibold">Gợi ý Sprint 2</h3>
        <p className="mt-1 text-slate-600">
          Bạn có thể bấm vào từng phòng để xem trang chi tiết (gallery, tiện ích, reviews demo).
          Trang <b>/search</b> có bộ lọc cơ bản (city/price/guests/bedrooms).
        </p>
      </div>
    </div>
  );
}
