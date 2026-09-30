"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import Container from "./layout/Container";
import Button from "./atoms/Button";

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
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }

  return (
    <div className="room-tabs sticky top-[var(--header-height)] z-30 border-b border-line bg-surface/95 backdrop-blur-xl">
      <Container>
        <nav
          className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3"
          aria-label={t("room.detailTitle")}
        >
        {SECTIONS.map((s) => (
          <Button
            key={s.id}
            onClick={() => onGo(s.id)}
            aria-current={active === s.id ? "true" : undefined}
            variant={active === s.id ? "ink" : "ghost"} size="sm" className="shrink-0"
          >
            {t(s.labelKey)}
          </Button>
        ))}
        </nav>
      </Container>
    </div>
  );
}
