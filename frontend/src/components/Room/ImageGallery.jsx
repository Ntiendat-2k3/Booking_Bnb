"use client";

import { useState } from "react";
import Image from "next/image";

export default function ImageGallery({ images, title }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images?.length) return null;

  const cover = images.find((x) => x.is_cover) || images[0];
  const gridImages = images.filter((im) => im.id !== cover?.id);

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "auto";
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // We need to pass the original array for the lightbox to browse all
  // Let's reorder or just use the whole array where cover is first?
  // Let's just use `images` array as is for the lightbox.
  const allImages = [cover, ...gridImages];

  return (
    <>
      <div className="grid grid-cols-1 gap-2 overflow-hidden md:grid-cols-4 rounded-2xl relative group">
        <div
          className="md:col-span-2 h-[300px] md:h-[410px] relative cursor-pointer"
          onClick={() => openLightbox(0)}
        >
          <Image
            src={cover?.url || "https://picsum.photos/seed/cover/1200/800"}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-all hover:brightness-90"
          />
        </div>
        <div className="hidden grid-cols-2 gap-2 md:grid md:col-span-2">
          {gridImages.slice(0, 4).map((im, idx) => (
            <div
              key={im.id}
              className="h-[201px] relative cursor-pointer"
              onClick={() => openLightbox(idx + 1)}
            >
              <Image
                src={im.url}
                alt={title}
                fill
                sizes="25vw"
                className="object-cover transition-all hover:brightness-90"
              />
            </div>
          ))}
        </div>
        
        {allImages.length > 5 && (
          <button
            onClick={() => openLightbox(0)}
            className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md border hover:bg-slate-50 transition"
          >
            Hiển thị tất cả ảnh
          </button>
        )}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-sm">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:bg-white/10 p-2 rounded-full transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 lg:left-12 text-white hover:bg-white/10 p-3 rounded-full transition"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 lg:right-12 text-white hover:bg-white/10 p-3 rounded-full transition"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="relative w-full max-w-5xl h-[70vh] px-12 select-none">
            <Image
              src={allImages[currentIndex]?.url || "https://picsum.photos/seed/full/1200/800"}
              alt={`${title} - Hình ${currentIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>

          <div className="absolute bottom-4 text-white/80 text-sm">
            {currentIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </>
  );
}
