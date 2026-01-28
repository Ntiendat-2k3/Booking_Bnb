"use client";

import { useEffect, useMemo, useState } from "react";

const SECTIONS = [
  { id: "photos", label: "Ảnh" },
  { id: "amenities", label: "Tiện nghi" },
  { id: "reviews", label: "Đánh giá" },
  { id: "location", label: "Vị trí" },
];

export default function RoomTabs() {
  const [active, setActive] = useState("photos");

  const observers = useMemo(() => ({ current: null }), []);

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
    observers.current = io;

    return () => {
      try {
        els.forEach((el) => io.unobserve(el));
        io.disconnect();
      } catch {}
    };
  }, [observers]);

  function onGo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="sticky top-16 z-30 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => onGo(s.id)}
            className={
              "relative py-3 text-sm font-medium " +
              (active === s.id ? "text-slate-900" : "text-slate-600 hover:text-slate-900")
            }
          >
            {s.label}
            {active === s.id ? <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-slate-900" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
