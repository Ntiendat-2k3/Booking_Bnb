"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import Container from "./layout/Container";

const SECTIONS = [
  { id: "photos", labelKey: "room.photos" },
  { id: "amenities", labelKey: "room.amenities" },
  { id: "reviews", labelKey: "room.reviews" },
  { id: "location", labelKey: "room.location" },
];

export default function RoomTabs() {
  const t = useTranslations();
  const [active, setActive] = useState("photos");
  const observerRef = useRef(null);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0.1, 0.2, 0.4, 0.6] }
    );

    els.forEach((el) => io.observe(el));
    observerRef.current = io;

    return () => {
      try {
        els.forEach((el) => io.unobserve(el));
        io.disconnect();
      } catch {}
    };
  }, []);

  function onGo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="sticky top-[72px] z-30 border-b border-line bg-surface/95 backdrop-blur-xl">
      <Container>
        <nav
          className="flex items-center gap-6 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={t("room.detailTitle")}
        >
        {SECTIONS.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => onGo(s.id)}
            aria-current={active === s.id ? "location" : undefined}
            className={
              "relative min-h-11 shrink-0 py-3 text-sm font-semibold transition " +
              (active === s.id
                ? "text-ink"
                : "text-muted-ink hover:text-ink")
            }
          >
            {t(s.labelKey)}
            {active === s.id ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />
            ) : null}
          </button>
        ))}
        </nav>
      </Container>
    </div>
  );
}
