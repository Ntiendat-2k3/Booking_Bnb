import Image from "next/image";
import SectionRow from "@/components/SectionRow";
import SearchPills from "@/components/Search/SearchPills";
import { serverGetJson } from "@/lib/serverApi";
import { SECTION_CONFIG } from "@/lib/constants";
import { getServerTranslator } from "@/i18n/server";

async function getSection({ city, limit = 8, sort = "rating_desc" }) {
  const q = new URLSearchParams({
    ...(city ? { city } : {}),
    limit: String(limit),
    sort,
  });

  try {
    // Giữ dữ liệu trang chủ trong 60 giây để giảm tải cho API.
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
    return [];
  }
}

export default async function HomePage() {
  const { t } = await getServerTranslator();
  const sections = await Promise.all(
    SECTION_CONFIG.map(async (s) => ({
      ...s,
      items: await getSection(s),
    })),
  );

  return (
    <div className="space-y-14">
      <section className="relative isolate overflow-visible rounded-[20px] bg-ink">
        <div className="relative min-h-[460px] overflow-hidden rounded-[20px]">
          <Image
            src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=85"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1760px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(25,22,19,0.78)_0%,rgba(25,22,19,0.48)_48%,rgba(25,22,19,0.12)_100%)]" />
          <div className="relative flex min-h-[460px] max-w-3xl flex-col justify-center px-6 pb-32 pt-12 text-white sm:px-10 lg:px-16">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/75">
              {t("home.eyebrow")}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              {t("home.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
              {t("home.description")}
            </p>
          </div>
        </div>
        <div className="relative z-20 mx-4 -mt-20 pb-4 sm:mx-8 md:absolute md:inset-x-8 md:bottom-0 md:mx-0 md:translate-y-1/2 md:pb-0 lg:inset-x-16">
          <SearchPills variant="hero" />
        </div>
      </section>

      {sections.map((s) => (
        <SectionRow
          key={s.titleKey}
          title={t(s.titleKey)}
          items={s.items}
          city={s.city}
        />
      ))}
    </div>
  );
}
