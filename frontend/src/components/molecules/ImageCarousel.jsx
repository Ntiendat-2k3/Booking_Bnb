"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useTranslations } from "@/i18n/LocaleProvider";
import clsx from "clsx";
import styles from "./ImageCarousel.module.css";

const reducedMotion = "(prefers-reduced-motion: reduce)";
const getInitialIndex = () => 0;
const previewScale = 3 / 7;
const previewHeight = 0.7;

/** Cả dải ảnh chạy sang trái; ảnh vào vị trí chính lớn dần, ảnh rời vị trí thu nhỏ bằng transform. */
export default function ImageCarousel({ images, label, className, sizes }) {
  const t = useTranslations();
  // Lặp nguyên chu kỳ ảnh để Embla vẫn loop khi API chỉ có hai hoặc ba ảnh.
  const slides = useMemo(
    () =>
      images.length > 1
        ? Array.from(
            { length: Math.ceil(4 / images.length) * images.length },
            (_, index) => images[index % images.length],
          )
        : images,
    [images],
  );
  const plugins = useMemo(
    () => [
      AutoScroll({
        active: images.length > 1,
        direction: "forward",
        speed: 1,
        startDelay: 0,
        stopOnMouseEnter: false,
        stopOnFocusIn: false,
        stopOnInteraction: false,
        breakpoints: { [reducedMotion]: { active: false } },
      }),
    ],
    [images.length],
  );
  const [viewportRef, api] = useEmblaCarousel(
    {
      align: (viewSize, slideSize) =>
        (viewSize -
          slideSize * (images.length > 1 ? 2 / (1 + previewScale) : 1)) /
        2,
      loop: true,
      containScroll: false,
      dragFree: true,
      breakpoints: { [reducedMotion]: { duration: 0 } },
    },
    plugins,
  );

  useEffect(() => {
    if (!api || slides.length <= 1) return;
    const media = api
      .slideNodes()
      .map((slide) => slide.querySelector("[data-carousel-media]"));
    // Đọc vị trí từ engine, không đo layout hoặc cập nhật React state mỗi frame.
    const updateSizes = () => {
      const engine = api.internalEngine();
      const step = Math.abs(engine.scrollSnaps[1] - engine.scrollSnaps[0]);
      if (!step) return;
      const location = engine.offsetLocation.get();
      media.forEach((node, index) => {
        if (!node) return;
        const loopOffset =
          engine.slideLooper.loopPoints
            .find((point) => point.index === index)
            ?.target() || 0;
        const offset =
          (engine.scrollSnaps[index] - location - loopOffset) / step;
        const progress = Math.max(0, 1 - Math.abs(offset));
        const emphasis = progress * progress * (3 - 2 * progress);
        const scaleX = previewScale + (1 - previewScale) * emphasis;
        const scaleY = previewHeight + (1 - previewHeight) * emphasis;
        node.style.setProperty("--slide-scale-x", String(scaleX));
        node.style.setProperty("--slide-scale-y", String(scaleY));
        node.style.setProperty("--slide-depth", `${-56 * (1 - emphasis)}px`);
        node.style.setProperty(
          "--slide-tilt",
          `${Math.sign(offset) * 8 * (1 - emphasis)}deg`,
        );
        node.style.setProperty(
          "--slide-opacity",
          String(0.64 + 0.36 * emphasis),
        );
        // Bù tỉ lệ ảnh bên trong để khung hẹp không kéo méo nội dung ảnh.
        node.style.setProperty("--cover-scale", String(scaleY / scaleX));
      });
    };
    updateSizes();
    api.on("scroll", updateSizes).on("reInit", updateSizes);
    return () => {
      api.off("scroll", updateSizes).off("reInit", updateSizes);
    };
  }, [api, slides]);

  const subscribe = useCallback(
    (listener) => {
      if (!api) return () => {};
      api.on("select", listener).on("reInit", listener);
      return () => {
        api.off("select", listener).off("reInit", listener);
      };
    },
    [api],
  );
  const getIndex = useCallback(() => api?.selectedScrollSnap() || 0, [api]);
  const selected = useSyncExternalStore(subscribe, getIndex, getInitialIndex);

  function changeSlide(direction) {
    api?.plugins().autoScroll?.stop();
    if (direction === "previous") api?.scrollPrev();
    else api?.scrollNext();
  }

  return (
    <div
      role="region"
      aria-roledescription={t("carousel.role")}
      aria-label={label}
      tabIndex={0}
      onFocusCapture={(event) => {
        if (event.target === event.currentTarget)
          api?.plugins().autoScroll?.stop();
      }}
      onBlurCapture={(event) => {
        if (
          images.length <= 1 ||
          event.currentTarget.contains(event.relatedTarget) ||
          window.matchMedia(reducedMotion).matches
        )
          return;
        api?.plugins().autoScroll?.play(0);
      }}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)
        )
          return;
        event.preventDefault();
        changeSlide(event.key === "ArrowLeft" ? "previous" : "next");
      }}
      style={{
        "--preview-scale": previewScale,
        "--preview-height": previewHeight,
        "--preview-cover": previewHeight / previewScale,
        "--card-width": `${200 / (1 + previewScale)}%`,
      }}
      className={clsx(
        styles.carousel,
        images.length <= 1 && styles.single,
        "relative min-w-0",
        className,
      )}
    >
      <div
        ref={viewportRef}
        className={clsx(styles.viewport, "touch-pan-y touch-pinch-zoom")}
      >
        <div className={styles.track}>
          {slides.map((image, index) => (
            <div
              key={`${image.src}-${index}`}
              role="group"
              aria-roledescription={t("carousel.slide")}
              aria-label={t("carousel.position", {
                current: (index % images.length) + 1,
                total: images.length,
              })}
              aria-hidden={index !== selected}
              className={styles.slide}
            >
              <div
                data-carousel-media
                className={clsx(
                  styles.media,
                  index === 0 && styles.initialPrimary,
                )}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority={index === 0}
                  sizes={sizes}
                  className={clsx(styles.image, "object-cover")}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
