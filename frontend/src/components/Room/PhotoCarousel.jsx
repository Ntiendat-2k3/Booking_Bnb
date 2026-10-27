"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useTranslations } from "@/i18n/LocaleProvider";

/** Hiển thị ảnh phòng bằng Embla; lớp bọc quyết định hành động khi mở ảnh. */
export default function PhotoCarousel({
  images,
  title,
  activeIndex,
  paused,
  onOpen,
  onSelect,
}) {
  const t = useTranslations();
  const [viewportRef, api] = useEmblaCarousel({ loop: images.length > 1 });
  const [interactionPaused, setInteractionPaused] = useState(false);

  const subscribe = useCallback(
    (listener) => {
      if (!api) return () => {};
      const handleSelection = () => {
        listener();
        onSelect?.(api.selectedScrollSnap());
      };
      api.on("select", handleSelection).on("reInit", handleSelection);
      return () => {
        api.off("select", handleSelection).off("reInit", handleSelection);
      };
    },
    [api, onSelect],
  );
  const getIndex = useCallback(() => api?.selectedScrollSnap() || 0, [api]);
  const selectedIndex = useSyncExternalStore(subscribe, getIndex, () => 0);

  useEffect(() => {
    if (api && selectedIndex !== activeIndex) api.scrollTo(activeIndex);
  }, [api, activeIndex, selectedIndex]);

  // Tự chuyển từng ảnh; dừng khi tab ẩn, mở lightbox hoặc người dùng cần giảm chuyển động.
  useEffect(() => {
    if (!api || images.length < 2 || paused || interactionPaused) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer;
    const updateTimer = () => {
      window.clearInterval(timer);
      if (!motion.matches && !document.hidden)
        timer = window.setInterval(() => api.scrollNext(), 3000);
    };
    updateTimer();
    motion.addEventListener("change", updateTimer);
    document.addEventListener("visibilitychange", updateTimer);
    return () => {
      window.clearInterval(timer);
      motion.removeEventListener("change", updateTimer);
      document.removeEventListener("visibilitychange", updateTimer);
    };
  }, [api, images.length, paused, interactionPaused]);

  return (
    <div
      role="region"
      aria-roledescription={t("carousel.role")}
      aria-label={t("room.galleryLabel")}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteractionPaused(false);
      }}
    >
      <div
        ref={viewportRef}
        className="room-cover relative h-[420px] w-full overflow-hidden lg:h-[580px]"
      >
        <div className="flex h-full touch-pan-y touch-pinch-zoom">
          {images.map((image, index) => (
            <div
              key={image.id || image.url}
              className="relative h-full min-w-0 flex-[0_0_100%]"
            >
              <button
                type="button"
                className="relative block h-full w-full text-left focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand"
                aria-label={t("room.imageNumber", { title, number: index + 1 })}
                aria-hidden={index !== selectedIndex}
                tabIndex={index === selectedIndex ? 0 : -1}
                onClick={() => onOpen(index)}
              >
                <Image
                  src={image.url}
                  alt={title}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover transition duration-300 hover:brightness-90 motion-reduce:transition-none"
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 ? (
        <>
          <div className="room-gallery-thumbnails absolute left-6 top-24 z-10 grid gap-3">
            {images.slice(1, 5).map((image, index) => (
              <button
                type="button"
                key={image.id || image.url}
                className={`relative h-20 w-20 overflow-hidden rounded-control border-2 text-left shadow-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand ${selectedIndex === index + 1 ? "border-brand" : "border-white/60"}`}
                aria-label={t("room.imageNumber", { title, number: index + 2 })}
                aria-pressed={selectedIndex === index + 1}
                onClick={() => api?.scrollTo(index + 1)}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
