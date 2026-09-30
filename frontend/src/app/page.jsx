import Image from "next/image";
import { Suspense } from "react";
import { ArrowUpRight, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import SectionRow from "@/components/SectionRow";
import SearchPills from "@/components/Search/SearchPills";
import CategoryTabs from "@/components/CategoryTabs";
import Button from "@/components/atoms/Button";
import ImageCarousel from "@/components/molecules/ImageCarousel";
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import { serverGetJson } from "@/lib/serverApi";
import { getListingCardData } from "@/lib/listings";
import { SECTION_CONFIG, SITE_IMAGES, POPULAR_DESTINATIONS } from "@/lib/constants";
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
    const items = (res.data?.items || []).map(getListingCardData);

    if (!city || items.length) return items;

    const fallbackQ = new URLSearchParams({ limit: String(limit), sort });
    const fallback = await serverGetJson(
      "/api/v1/listings?" + fallbackQ.toString(),
      { next: { revalidate: 60 } },
    );
    return (fallback.data?.items || []).map(getListingCardData);
  } catch (error) {
    console.error("Failed to fetch section during prerendering:", error.message);
    return [];
  }
}

const heroImageProps = {
  className: "h-[280px] w-full sm:h-[400px]",
  sizes: "(max-width: 1024px) 70vw, 450px",
};

/** Chỉ carousel chờ ảnh từ API; phần giới thiệu và tìm kiếm vẫn xuất ngay. */
async function HeroCarousel({ itemsPromise, t }) {
  const items = await itemsPromise;
  const heroImages = [
    { src: SITE_IMAGES.exterior, alt: t("home.exteriorAlt") },
    ...items.flatMap((listing) => {
      const src = listing.cover_url || listing.images?.[0]?.url;
      return src ? [{ src, alt: listing.title || t("listing.fallbackTitle") }] : [];
    }),
    { src: SITE_IMAGES.interior, alt: t("home.interiorAlt") },
  ].filter((image, index, images) => images.findIndex((other) => other.src === image.src) === index).slice(0, SECTION_CONFIG[0].limit);
  return <ImageCarousel images={heroImages} label={t("home.carouselLabel")} {...heroImageProps} />;
}

/** Giải quyết promise ở đúng vùng dữ liệu, dùng lại bộ card và bộ sưu tập hiện có. */
async function HomeListingsSection({ itemsPromise, collectionsPromise, ...props }) {
  const [items, collections] = await Promise.all([itemsPromise, collectionsPromise]);
  return <SectionRow {...props} items={items} collections={collections} />;
}

/** Dùng lại ảnh từ các bộ sưu tập, không chặn hero hoặc tạo thêm yêu cầu API. */
async function HomeDestinations({ collectionsPromise, t }) {
  const collections = await collectionsPromise;
  return (
    <section className="home-destinations space-y-6" aria-labelledby="destinations-title">
      <div>
        <h2 id="destinations-title" className="text-3xl sm:text-4xl">{t("home.destinationsTitle")}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-ink">{t("home.destinationsDescription")}</p>
      </div>
      <div className="destination-grid no-scrollbar grid grid-flow-col auto-cols-[72%] gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:auto-cols-[38%] lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-6">
        {POPULAR_DESTINATIONS.slice(0, 6).map((destination) => {
          const listing = collections.find((collection) => collection.city === destination.value)?.items[0];
          return <Button key={destination.value} href={`/search?${new URLSearchParams({ city: destination.value })}`} variant="ghost" className="destination-card relative min-h-44 snap-start overflow-hidden p-4">
            <Image src={listing?.cover_url || SITE_IMAGES.exterior} alt="" fill sizes="(max-width: 640px) 72vw, (max-width: 1024px) 38vw, 220px" className="object-cover" />
            <span className="relative z-10 flex w-full items-center justify-between gap-2 self-end">{t(destination.labelKey)}<ArrowUpRight aria-hidden size={18} className="shrink-0" /></span>
          </Button>;
        })}
      </div>
    </section>
  );
}

function SectionSkeleton({ count, layout = "rail" }) {
  return <div className="space-y-6" aria-hidden="true">
    <div className="h-8 w-64 max-w-full animate-pulse rounded-control bg-muted-surface" />
    <div className={layout === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5" : "no-scrollbar grid auto-cols-[82%] grid-flow-col gap-4 overflow-hidden sm:auto-cols-[45%] lg:auto-cols-[calc((100%-3rem)/4)]"}>
      {Array.from({ length: count }, (_, index) => <div key={index} className="min-w-0"><ListingCardSkeleton /></div>)}
    </div>
  </div>;
}

export default async function HomePage() {
  const { t } = await getServerTranslator();
  const suggested = SECTION_CONFIG[0];
  const itemsPromise = getSection(suggested);
  const collectionsPromise = Promise.all(SECTION_CONFIG.slice(1).map(async (section) => ({
    ...section,
    items: await getSection(section),
  })));

  return (
    <div className="nature-page home-page space-y-12 sm:space-y-16">
      <link rel="preload" as="image" href="/nature-hero.webp" media="(width < 1024px)" />
      <section aria-labelledby="home-title" className="home-hero reveal pt-2 sm:pt-6">
        <div className="home-hero-photo lg:hidden" />
        <div className="home-hero-grid grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="home-hero-copy max-w-xl py-4 lg:py-8">
            <p className="mb-6 text-sm font-semibold text-brand">{t("home.eyebrow")}</p>
            <h1 id="home-title" className="whitespace-pre-line text-5xl font-bold leading-[1.1] tracking-[-0.055em] text-ink sm:text-6xl xl:text-7xl">
              {t("home.title")}
            </h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-muted-ink sm:text-lg">{t("home.description")}</p>
          </div>
          <div className="hidden lg:block"><Suspense fallback={<div className={`flex items-center justify-center py-3 ${heroImageProps.className}`}>
            <div className="relative h-full w-[62%] min-w-0 overflow-hidden rounded-feature bg-muted-surface shadow-soft"><Image src={SITE_IMAGES.exterior} alt={t("home.exteriorAlt")} fill priority sizes={heroImageProps.sizes} className="object-cover" /></div>
          </div>}>
            <HeroCarousel itemsPromise={itemsPromise} t={t} />
          </Suspense></div>
        </div>
        <div className="home-search relative z-20 mt-7 sm:mt-9">
          <SearchPills />
        </div>
      </section>

      <div className="space-y-7">
        <Suspense fallback={<SectionSkeleton count={suggested.limit} layout={suggested.layout} />}>
          <HomeListingsSection title={t(suggested.titleKey)} itemsPromise={itemsPromise} layout={suggested.layout}>
            <div className="md:order-first"><Suspense fallback={null}><CategoryTabs /></Suspense></div>
          </HomeListingsSection>
        </Suspense>
      </div>

      <section className="home-host relative isolate grid overflow-hidden rounded-feature lg:grid-cols-2">
        <Image src="/nature-hero.webp" alt="" fill sizes="100vw" className="-z-10 object-cover" />
        <div className="flex flex-col items-start justify-center p-8 sm:p-10 lg:p-12">
          <h2 className="max-w-md text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{t("home.hostTitle")}</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-ink">{t("home.hostDescription")}</p>
          <Button href="/host" variant="secondary" className="mt-6 rounded-full">{t("navigation.becomeHost")}<ArrowRight aria-hidden size={18} /></Button>
        </div>
        <div className="host-photo-stack relative mx-8 mb-8 min-h-56 lg:mx-10 lg:my-10" aria-hidden="true">
          <div className="host-photo relative h-56 w-[60%] rotate-[-7deg] sm:h-72"><Image src={SITE_IMAGES.exterior} alt="" fill sizes="(max-width: 1024px) 55vw, 360px" className="object-cover" /></div>
          <div className="host-photo absolute bottom-0 right-0 h-56 w-[52%] rotate-[8deg] sm:h-64"><Image src={SITE_IMAGES.interior} alt="" fill sizes="(max-width: 1024px) 45vw, 300px" className="object-cover" /></div>
        </div>
      </section>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-panel bg-muted-surface" aria-hidden="true" />}>
        <HomeDestinations collectionsPromise={collectionsPromise} t={t} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton count={SECTION_CONFIG[1].limit} />}>
        <HomeListingsSection title={t("home.discoverCities")} collectionsPromise={collectionsPromise} />
      </Suspense>
    </div>
  );
}
