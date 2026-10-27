"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatCircleDots } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { chatApi } from "../api/chatApi";
import { useChatSocket } from "../hooks/useChatSocket";

export default function ChatNavLink({ userId, dock = false, active = false }) {
  const t = useTranslations();
  const [state, setState] = useState({ userId: null, count: null });
  const count = state.userId === userId ? state.count : null;
  const connected = useChatSocket(userId, (event) => {
    if (["chat:message", "chat:read", "chat:conversation", "connection"].includes(event)) {
      chatApi.unread().then((value) => setState({ userId, count: value }))
        .catch(() => setState({ userId, count: null }));
    }
  });
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = () => chatApi.unread().then((value) => { if (active) setState({ userId, count: value }); })
      .catch(() => { if (active) setState({ userId, count: null }); });
    load();
    const timer = setInterval(load, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [userId]);
  if (!userId) return null;
  return <Link href="/messages"
    className={dock ? "relative min-w-0 rounded-control focus-visible:ring-2 focus-visible:ring-brand" :
      "relative grid h-11 w-11 place-items-center rounded-full text-ink transition hover:bg-muted-surface focus-visible:ring-2 focus-visible:ring-brand"}
    aria-current={active ? "page" : undefined}
    aria-label={count > 0 ? `${t("navigation.messages")}, ${t("chat.unreadCount", { count })}` : t("navigation.messages")}>
    <ChatCircleDots aria-hidden size={21} />
    {dock && <span>{t("navigation.messages")}</span>}
    {Number.isInteger(count) && count > 0 && <span className={`absolute ${dock ? "right-0 top-0" : "-right-1 -top-1"} min-w-5 rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-5 text-on-brand`}>{count > 99 ? "99+" : count}</span>}
    {!connected && <span className="sr-only">{t("chat.reconnecting")}</span>}
  </Link>;
}
