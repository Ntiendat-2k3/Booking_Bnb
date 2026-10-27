"use client";

import { animated, useReducedMotion, useTransition } from "@react-spring/web";
import { useLocale } from "@/i18n/LocaleProvider";

const EXAMPLE = "Tìm homestay ở Đà Lạt cho 4 người, dưới 1,5 triệu/đêm, có bếp và gần trung tâm";

/** Hiển thị hội thoại ở cả trang đầy đủ và trợ lý nổi, giữ chuyển động theo tùy chọn hệ thống. */
export default function AiSearchConversation({ conversation, onExample }) {
  const { locale } = useLocale();
  const reducedMotion = useReducedMotion();
  const transitions = useTransition(conversation, {
    keys: (_, index) => index,
    from: { opacity: 0, transform: "translate3d(0, 10px, 0) scale(0.98)" },
    enter: { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
    trail: 75,
    config: { tension: 320, friction: 24 },
    immediate: reducedMotion,
  });

  return <div aria-live="polite" className="space-y-3">
    {conversation.length ? transitions((styles, entry) => (
      <animated.p
        style={styles}
        className={`max-w-[85%] rounded-control px-4 py-3 text-sm ${entry.role === "user" ? "ml-auto bg-brand text-on-brand" : "bg-muted-surface text-ink"}`}
      >
        {entry.text}
      </animated.p>
    )) : <p className="text-sm text-muted-ink">
      {locale === "en" ? "Try: " : "Ví dụ: "}
      <button type="button" onClick={() => onExample(EXAMPLE)} className="font-medium text-left underline text-brand">
        {EXAMPLE}
      </button>
    </p>}
  </div>;
}
