"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CaretLeft,
  CaretRight,
  ImagesSquare,
  X,
} from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";

export default function ImageGallery({ images, title }) {
  const t = useTranslations();
  const dialogRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    if (!lightboxOpen) return;

    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowRight") setCurrentIndex((index) => (index + 1) % images.length);
      if (event.key === "ArrowLeft") setCurrentIndex((index) => (index - 1 + images.length) % images.length);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      dialog?.close();
      trigger?.focus();
    };
  }, [lightboxOpen, images?.length]);

  if (!images?.length) return null;

  const cover = images.find((image) => image.is_cover) || images[0];
  const gridImages = images.filter((image) => image.id !== cover?.id);
  const allImages = [cover, ...gridImages];

  return (
    <>
      <div className="group relative grid grid-cols-1 gap-2 overflow-hidden rounded-2xl md:grid-cols-4">
        <button
          type="button"
          className="relative h-[300px] overflow-hidden text-left md:col-span-2 md:h-[410px]"
          onClick={() => openLightbox(0)}
          aria-label={t("room.imageNumber", { title, number: 1 })}
        >
          <Image
            src={cover?.url || "https://picsum.photos/seed/cover/1200/800"}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition duration-300 hover:brightness-90 motion-reduce:transition-none"
          />
        </button>
        <div className="hidden grid-cols-2 gap-2 md:grid md:col-span-2">
          {gridImages.slice(0, 4).map((im, idx) => (
            <button
              type="button"
              key={im.id}
              className="relative h-[201px] overflow-hidden text-left"
              onClick={() => openLightbox(idx + 1)}
              aria-label={t("room.imageNumber", {
                title,
                number: idx + 2,
              })}
            >
              <Image
                src={im.url}
                alt={title}
                fill
                sizes="25vw"
                className="object-cover transition duration-300 hover:brightness-90 motion-reduce:transition-none"
              />
            </button>
          ))}
        </div>

        {allImages.length > 5 && (
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-muted-surface"
          >
            <ImagesSquare aria-hidden size={18} />
            {t("room.showAllPhotos")}
          </button>
        )}
      </div>

      {lightboxOpen && (
        <dialog ref={dialogRef} onCancel={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[100] m-0 flex h-dvh w-screen max-w-none items-center justify-center bg-black/95 backdrop-blur-sm text-white"
          role="dialog"
          aria-modal="true"
          aria-label={t("room.galleryLabel")}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full text-white transition hover:bg-white/10"
            aria-label={t("common.close")}
          >
            <X aria-hidden size={24} weight="bold" />
          </button>

          <button
            type="button"
            onClick={prevImage}
            className="absolute left-3 z-10 grid h-12 w-12 place-items-center rounded-full text-white transition hover:bg-white/10 lg:left-12"
            aria-label={t("room.previousImage")}
          >
            <CaretLeft aria-hidden size={30} weight="bold" />
          </button>

          <button
            type="button"
            onClick={nextImage}
            className="absolute right-3 z-10 grid h-12 w-12 place-items-center rounded-full text-white transition hover:bg-white/10 lg:right-12"
            aria-label={t("room.nextImage")}
          >
            <CaretRight aria-hidden size={30} weight="bold" />
          </button>

          <div className="relative h-[70vh] w-full max-w-5xl select-none px-12">
            <Image
              src={allImages[currentIndex]?.url || "https://picsum.photos/seed/full/1200/800"}
              alt={t("room.imageNumber", {
                title,
                number: currentIndex + 1,
              })}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <div className="absolute bottom-4 text-sm text-white/80">
            {currentIndex + 1} / {allImages.length}
          </div>
        </dialog>
      )}
    </>
  );
}
