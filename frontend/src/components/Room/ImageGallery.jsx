"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CaretLeft,
  CaretRight,
  ImagesSquare,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import IconButton from "@/components/atoms/IconButton";
import FavoriteButton from "@/components/FavoriteButton";
import PhotoCarousel from "@/components/Room/PhotoCarousel";
import { notifyError, notifySuccess } from "@/lib/notify";

export default function ImageGallery({ images, title, listingId }) {
  const t = useTranslations();
  const dialogRef = useRef(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cover = images?.find((image) => image.is_cover) || images?.[0];
  // Đưa ảnh bìa lên đầu và bỏ URL trùng để mỗi lần chuyển hiển thị ảnh mới.
  const seenUrls = new Set();
  const allImages = [cover, ...(images || [])].filter((image) => {
    if (!image?.url || seenUrls.has(image.url)) return false;
    seenUrls.add(image.url);
    return true;
  });

  async function shareListing() {
    try {
      if (navigator.share) await navigator.share({ title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        notifySuccess(t("room.linkCopied"));
      }
    } catch (error) {
      if (error.name !== "AbortError") notifyError(t("room.shareFailed"));
    }
  }

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
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
      if (event.key === "ArrowRight") setCurrentIndex((index) => (index + 1) % allImages.length);
      if (event.key === "ArrowLeft") setCurrentIndex((index) => (index - 1 + allImages.length) % allImages.length);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      dialog?.close();
      trigger?.focus();
    };
  }, [lightboxOpen, allImages.length]);

  if (!allImages.length) return null;

  return (
    <>
      <div id="photos" className="room-gallery-hero group relative scroll-mt-28">
        <PhotoCarousel images={allImages} title={title} activeIndex={currentIndex} paused={lightboxOpen} onOpen={openLightbox} onSelect={setCurrentIndex} />
        {listingId && <div className="room-hero-actions absolute bottom-6 right-6 flex gap-2">
          <FavoriteButton listingId={listingId} variant="inverse" />
          <IconButton variant="inverse" label={t("room.share")} onClick={shareListing}><UploadSimple aria-hidden size={21} /></IconButton>
        </div>}
        <Button variant="secondary" size="sm" className="gallery-count absolute bottom-6 left-6" onClick={() => openLightbox(currentIndex)}>
          <ImagesSquare aria-hidden size={18} />{t("room.showAllPhotos")} ({allImages.length})
        </Button>
      </div>

      {lightboxOpen && (
        <dialog ref={dialogRef} onCancel={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[100] m-0 flex h-dvh w-screen max-w-none items-center justify-center bg-black/95 backdrop-blur-sm text-white"
          role="dialog"
          aria-modal="true"
          aria-label={t("room.galleryLabel")}
        >
          <IconButton
            onClick={closeLightbox}
            variant="inverse" className="absolute right-4 top-4"
            label={t("common.close")}
          >
            <X aria-hidden size={24} weight="bold" />
          </IconButton>

          <IconButton
            onClick={prevImage}
            variant="inverse" className="absolute left-3 z-10 lg:left-12"
            label={t("room.previousImage")}
          >
            <CaretLeft aria-hidden size={30} weight="bold" />
          </IconButton>

          <IconButton
            onClick={nextImage}
            variant="inverse" className="absolute right-3 z-10 lg:right-12"
            label={t("room.nextImage")}
          >
            <CaretRight aria-hidden size={30} weight="bold" />
          </IconButton>

          <div className="relative h-[70vh] w-full max-w-5xl select-none px-12">
            <Image
              src={allImages[currentIndex]?.url || "/placeholder-room.svg"}
              alt={t("room.imageNumber", {
                title,
                number: currentIndex + 1,
              })}
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              loading="eager"
              className="object-contain"
            />
            {allImages.length > 1 && <Image
              src={allImages[(currentIndex + 1) % allImages.length].url}
              alt=""
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              loading="eager"
              aria-hidden="true"
              className="pointer-events-none invisible object-contain"
            />}
          </div>

          <div className="absolute bottom-4 text-sm text-white/80">
            {currentIndex + 1} / {allImages.length}
          </div>
        </dialog>
      )}
    </>
  );
}
