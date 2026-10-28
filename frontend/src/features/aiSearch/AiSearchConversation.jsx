"use client";

import { animated, useReducedMotion, useTransition } from "@react-spring/web";
import { useLocale } from "@/i18n/LocaleProvider";
import { assistantReply } from "./assistantReply";

/** Hiển thị hội thoại ở cả trang đầy đủ và trợ lý nổi, giữ chuyển động theo tùy chọn hệ thống. */
export default function AiSearchConversation({ conversation, onExample }) {
  const { locale, t } = useLocale();
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
        {entry.role === "assistant" ? assistantReply(entry.reply, t, locale) : entry.text}
      </animated.p>
    )) : <p className="text-sm text-muted-ink">
      {t("aiSearch.tryExample")}
      <button type="button" onClick={() => onExample(t("aiSearch.example"))} className="font-medium text-left underline text-brand">
        {t("aiSearch.example")}
      </button>
    </p>}
  </div>;
}
