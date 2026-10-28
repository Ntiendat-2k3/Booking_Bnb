"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { animated, to, useReducedMotion, useSpring } from "@react-spring/web";
import { Mascot } from "page-mascot";
import { useLocale } from "@/i18n/LocaleProvider";
import { useAiSearch } from "./AiSearchProvider";
import { MASCOT_DIRECTIONS as DIRECTIONS, MASCOT_REACTIONS as REACTIONS } from "./mascotAssets";

const AiSearchExperience = lazy(() => import("./AiSearchExperience"));
const REACTION_CELLS = { listening: 4, thinking: 3, success: 8, error: 7 };
const POSITION_KEY = "booking-bnb-ai-mascot-position";
const MASCOT_SIZE = 112;
const POSES = {
  idle: { y: 0, rotate: 0, scale: 1 },
  open: { y: -4, rotate: -3, scale: 1.04 },
  listening: { y: -7, rotate: -6, scale: 1.07 },
  thinking: { y: -8, rotate: 5, scale: 1.06 },
  success: { y: -13, rotate: 8, scale: 1.13 },
  error: { y: 2, rotate: -7, scale: 0.97 },
};

/** Giữ mascot trong vùng nhìn thấy khi kéo hoặc đổi kích thước màn hình. */
function boundedPosition(x, y, width, height) {
  return {
    x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - width - 8)),
    y: Math.min(Math.max(32, y), Math.max(32, window.innerHeight - height - 8)),
  };
}

/** Mascot có thể kéo thả; reaction và chuyển động ngắn vẫn phản ánh trạng thái AI. */
export default function FloatingAiAssistant({ hidden = false }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { phase } = useAiSearch();
  const [openedAtPath, setOpenedAtPath] = useState(null);
  const [position, setPosition] = useState(null);
  const [viewport, setViewport] = useState(null);
  const dockRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickUntilRef = useRef(0);
  const isFullPage = pathname === "/ai-search";
  const isOpen = openedAtPath === pathname && !isFullPage;
  const reactionIndex = REACTION_CELLS[phase];
  const reducedMotion = useReducedMotion();
  const mascotSpring = useSpring({
    to: POSES[phase === "idle" && isOpen ? "open" : phase] || POSES.idle,
    config: { tension: 360, friction: 18 },
    immediate: reducedMotion,
  });

  useEffect(() => {
    const restorePosition = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      try {
        const saved = JSON.parse(window.localStorage.getItem(POSITION_KEY));
        if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y) &&
          saved.x >= 0 && saved.x <= 1 && saved.y >= 0 && saved.y <= 1) {
          setPosition(boundedPosition(saved.x * window.innerWidth, saved.y * window.innerHeight, MASCOT_SIZE, MASCOT_SIZE));
          return;
        }
      } catch { /* Trình duyệt có thể chặn bộ nhớ cục bộ. */ }
      setPosition((current) => current
        ? boundedPosition(current.x, current.y, MASCOT_SIZE, MASCOT_SIZE) : null);
    };
    restorePosition();
    window.addEventListener("resize", restorePosition);
    return () => window.removeEventListener("resize", restorePosition);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event) => {
      if (!dockRef.current?.contains(event.target)) setOpenedAtPath(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  /** Lưu tỷ lệ vị trí để mascot vẫn ở trong màn hình khi đổi kích thước cửa sổ. */
  function savePosition(next) {
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify({
        x: next.x / window.innerWidth, y: next.y / window.innerHeight,
      }));
    } catch { /* Không lưu được vị trí thì vẫn cho kéo trong phiên hiện tại. */ }
  }

  function handleDragStart(event) {
    if (event.button !== 0 || !event.target.closest(".ai-mascot-button")) return;
    const bounds = dockRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const button = event.target.closest(".ai-mascot-button");
    suppressClickUntilRef.current = 0;
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
      left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height,
      moved: false, last: null, button };
    button.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      setOpenedAtPath(null);
    }
    drag.last = boundedPosition(drag.left + dx, drag.top + dy, drag.width, drag.height);
    setPosition(drag.last);
  }

  function handleDragEnd(event) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.button.hasPointerCapture(event.pointerId)) drag.button.releasePointerCapture(event.pointerId);
    if (drag.moved && drag.last) {
      savePosition(drag.last);
      suppressClickUntilRef.current = Date.now() + 350;
    }
    dragRef.current = null;
  }

  function handleMascotClick(event) {
    if (Date.now() < suppressClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickUntilRef.current = 0;
      return;
    }
    if (isFullPage) {
      document.querySelector("main [data-ai-search-input]")?.focus();
      return;
    }
    setOpenedAtPath(isOpen ? null : pathname);
  }

  function closeAndFocusMascot() {
    setOpenedAtPath(null);
    dockRef.current?.querySelector(".ai-mascot-button")?.focus();
  }

  function handleMascotKeyDown(event) {
    const direction = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key];
    if (!direction || !event.target.closest(".ai-mascot-button")) return;
    event.preventDefault();
    const bounds = dockRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const next = boundedPosition(bounds.left + direction[0], bounds.top + direction[1], bounds.width, bounds.height);
    setPosition(next);
    savePosition(next);
  }

  if (hidden) return null;

  const spaceAbove = position?.y || 0;
  const spaceBelow = position && viewport ? viewport.height - position.y - MASCOT_SIZE : 0;
  const panelBelow = position && spaceBelow > spaceAbove;
  const panelWidth = viewport ? Math.min(420, viewport.width - 24) : 420;
  const panelLeft = position && viewport
    ? Math.min(Math.max(12, position.x + MASCOT_SIZE / 2 - panelWidth / 2), viewport.width - panelWidth - 12)
    : 0;
  const panelStyle = position && viewport ? {
    left: panelLeft,
    top: panelBelow ? position.y + MASCOT_SIZE + 12 : "auto",
    bottom: panelBelow ? "auto" : viewport.height - position.y + 12,
    "--ai-panel-space": `${Math.max(0, (panelBelow ? spaceBelow : spaceAbove) - 20)}px`,
  } : undefined;

  return <aside ref={dockRef} style={position ? { left: position.x, top: position.y } : undefined}
    className={`ai-mascot-dock fixed z-[60] ${position ? "ai-mascot-dock--moved" : "bottom-4 right-3 sm:right-6 md:bottom-6"}`}
    aria-label={t("aiSearch.assistantLabel")}>
    {isOpen ? <section id="ai-search-panel" role="dialog" aria-label={t("aiSearch.askTitle")}
      onKeyDown={(event) => { if (event.key === "Escape") closeAndFocusMascot(); }}
      style={panelStyle}
      className={`${position ? "fixed" : "absolute bottom-full right-0 mb-3"} flex w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-float`}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2">
        <Link href="/ai-search" onClick={() => setOpenedAtPath(null)} className="text-xs font-semibold text-brand hover:underline">{t("aiSearch.fullPage")}</Link>
        <button type="button" onClick={closeAndFocusMascot} aria-label={t("aiSearch.closeAssistant")} className="grid h-11 w-11 place-items-center rounded-control text-muted-ink hover:bg-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><X aria-hidden size={18} /></button>
      </div>
      <div className="min-h-0 overflow-y-auto p-4">
        <Suspense fallback={<p role="status" className="p-4 text-sm text-muted-ink">{t("common.loading")}</p>}>
          <AiSearchExperience compact />
        </Suspense>
      </div>
    </section> : null}
    <animated.div className="relative ml-auto w-fit select-none" title={t("aiSearch.dragHint")}
      onClickCapture={handleMascotClick} onKeyDown={handleMascotKeyDown}
      onPointerDown={handleDragStart} onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd} onPointerCancel={handleDragEnd}
      style={{ touchAction: "none", transform: to([mascotSpring.y, mascotSpring.rotate, mascotSpring.scale],
        (y, rotate, scale) => `translate3d(0, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`) }}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-2 right-2 z-10 rounded-full bg-brand px-3 py-1 text-xs font-bold text-on-brand shadow-sm">{t("aiSearch.ask")}</span>
      <Mascot directions={DIRECTIONS} reactions={REACTIONS} size={MASCOT_SIZE}
        label={t(isOpen ? "aiSearch.closeSearch" : "aiSearch.openSearch")}
        className="ai-mascot-button rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/50" />
      {reactionIndex !== undefined ? <span aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-no-repeat ${phase === "thinking" ? "motion-safe:animate-pulse" : ""}`}
        style={{ backgroundImage: `url(${REACTIONS})`, backgroundSize: "300% 300%",
          backgroundPosition: `${(reactionIndex % 3) * 50}% ${Math.floor(reactionIndex / 3) * 50}%` }} /> : null}
    </animated.div>
  </aside>;
}
