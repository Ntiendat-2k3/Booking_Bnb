import Link from "next/link";
import { useLocale } from "@/i18n/LocaleProvider";
import ChatAvatar from "./ChatAvatar";
import EmojiText from "./EmojiText";

export default function ConversationItem({ conversation, active }) {
  const { locale, t } = useLocale();
  const unreadCount = Number(conversation.unread_count || 0);
  const preview = conversation.last_message_recalled_at ? t("chat.recalled") :
    conversation.last_message_type === "call" ? t("chat.callHistory") :
    conversation.last_message_type === "image" ? t("chat.sentImage") :
      conversation.last_message_type === "video" ? t("chat.shared.video") :
      conversation.last_message_type === "audio" ? t("chat.voiceMessage") :
        conversation.last_message_type === "file" ? t("chat.sentFiles") :
          conversation.last_message_type === "shared_context" ? conversation.last_message_body || t("chat.sharedListing") :
            conversation.last_message_body || t("chat.noMessages");
  return <div className={`rounded-xl ${active ? "bg-muted-surface" : ""}`}><Link href={`/messages/${conversation.id}`} aria-current={active ? "page" : undefined}
    className={`flex min-h-20 min-w-0 items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-muted-surface focus-visible:ring-2 focus-visible:ring-brand ${active ? "bg-muted-surface" : ""}`}>
    <ChatAvatar src={conversation.other_avatar} name={conversation.other_name} size={44}
      online={conversation.other_online === true} statusLabel={t(conversation.other_online === true ? "chat.online" : "chat.offline")} />
    <span className="min-w-0 flex-1">
      <span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-ink">{conversation.other_name}</strong>
        {conversation.last_message_at && <time className="shrink-0 text-xs text-muted-ink" dateTime={conversation.last_message_at}>{new Date(conversation.last_message_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", { day: "numeric", month: "short" })}</time>}
      </span>
      <span className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-xs text-muted-ink"><EmojiText text={preview} /></span>
        {unreadCount > 0 && <span className="min-w-5 rounded-full bg-brand px-1.5 py-0.5 text-center text-[11px] font-bold text-on-brand" aria-label={t("chat.unreadCount", { count: unreadCount })}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </span>
    </span>
  </Link></div>;
}
