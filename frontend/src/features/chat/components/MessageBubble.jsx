import { useLocale } from "@/i18n/LocaleProvider";
import Image from "next/image";
import Link from "next/link";
import { ArrowBendUpLeft, DotsThree, Smiley, VideoCamera } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import IconButton from "@/components/atoms/IconButton";
import { chatApi } from "../api/chatApi";

const reactionChoices = ["❤️", "👍", "😂", "😮", "🙏"];

export default function MessageBubble({ message, mine, userId, otherName,
  onRetry, onReply, onReaction, onEdit, onRecall, onPin, pinned, blocked }) {
  const { locale, t } = useLocale();
  const [reactionOpen, setReactionOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body || "");
  const actionsRef = useRef(null);
  const actionButtonRef = useRef(null);
  const canChange = mine && !blocked && !message.status && !message.recalled_at && message.type === "text";
  const canRecall = mine && !blocked && !message.status && !message.recalled_at;
  const canAct = !blocked && !message.status && !message.recalled_at;
  useEffect(() => {
    if (!reactionOpen && !actionOpen) return;
    const onPointerDown = (event) => {
      if (!actionsRef.current?.contains(event.target)) { setReactionOpen(false); setActionOpen(false); }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setReactionOpen(false); setActionOpen(false); actionButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [reactionOpen, actionOpen]);
  if (message.type === "call") {
    const seconds = Math.max(0, Math.floor(Number(message.context?.duration_seconds) || 0));
    const minutes = Math.floor(seconds / 60);
    const duration = seconds >= 3600
      ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
      : `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
    return <li id={`message-${message.id}`} className="flex justify-center py-1">
      <div className="flex max-w-full items-center gap-3 rounded-2xl bg-muted-surface px-4 py-3 text-sm text-ink">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
          <VideoCamera aria-hidden size={20} weight="fill" /></span>
        <span className="min-w-0"><strong className="block font-semibold">
          {t(mine ? "chat.callOutgoing" : "chat.callIncoming", { name: otherName })}</strong>
          <span className="block text-xs text-muted-ink">{t("chat.callDuration", { duration })} · <time dateTime={message.created_at}>
            {new Date(message.created_at).toLocaleTimeString(locale === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </time></span></span>
      </div>
    </li>;
  }
  const linkMatch = message.type === "text" && !message.recalled_at
    ? message.body?.match(/https?:\/\/[^\s<>]+/i)?.[0] : null;
  let link;
  try { if (linkMatch) link = new URL(linkMatch); } catch { /* Liên kết không hợp lệ chỉ hiển thị như văn bản. */ }
  const reactions = Object.entries((message.reactions || []).reduce((counts, reaction) => {
    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    return counts;
  }, {}));
  const media = !message.status && !message.recalled_at && ["image", "audio", "video"].includes(message.type)
    ? chatApi.mediaUrl(message.conversation_id, message.id) : null;
  return <li id={`message-${message.id}`} className={`flex min-w-0 ${mine ? "justify-end" : "justify-start"}`}>
    <div className={`flex min-w-0 max-w-[85%] flex-col ${mine ? "items-end" : "items-start"} sm:max-w-[70%]`}>
      {!mine && message.sender_name && <p className="mb-1 px-2 text-xs font-semibold text-muted-ink">{message.sender_name}</p>}
      {message.reply_to_id && <button type="button"
        onClick={() => document.getElementById(`message-${message.reply_to_id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
        className="mb-1 max-w-full rounded-xl border-l-2 border-brand bg-muted-surface px-3 py-1.5 text-left text-xs">
        <strong className="block text-brand">{message.replyTo?.sender_id === userId ? t("chat.you") :
          message.replyTo?.sender_name || otherName}</strong>
        <span className="block truncate text-muted-ink">{!message.replyTo || message.replyTo.recalled_at
          ? t("chat.replyUnavailable") : message.replyTo.body || t(message.replyTo.type === "image" ? "chat.sentImage" :
            message.replyTo.type === "audio" ? "chat.voiceMessage" :
              message.replyTo.type === "video" ? "chat.shared.video" :
              message.replyTo.type === "file" ? "chat.sentFiles" :
                message.replyTo.type === "shared_context" ? "chat.sharedListing" : "chat.replyUnavailable")}</span>
      </button>}
      {message.recalled_at ? <p className="w-fit max-w-full rounded-2xl bg-muted-surface px-3.5 py-2.5 text-sm italic text-muted-ink">{t("chat.recalled")}</p> :
        editing ? <form onSubmit={async (event) => {
          event.preventDefault();
          const body = draft.trim();
          if (body && body.length <= 4000 && await onEdit(message, body)) setEditing(false);
        }} className="rounded-xl border border-line p-2">
          <label className="sr-only" htmlFor={`edit-${message.id}`}>{t("chat.editMessage")}</label>
          <textarea id={`edit-${message.id}`} maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)}
            className="w-full resize-none rounded-lg bg-muted-surface p-2 text-sm text-ink outline-none focus:ring-2 focus:ring-brand" />
          <div className="flex justify-end gap-3 text-xs font-semibold text-brand">
            <button type="button" onClick={() => setEditing(false)}>{t("chat.cancelEdit")}</button>
            <button type="submit" disabled={!draft.trim()}>{t("chat.saveEdit")}</button>
          </div>
        </form> :
        message.type === "shared_context" && message.context?.type === "listing" && message.context.id ?
          <Link href={`/rooms/${encodeURIComponent(message.context.id)}`}
            aria-label={t("chat.viewListing", { title: message.context.title || t("chat.sharedListing") })}
            className="block overflow-hidden rounded-2xl border border-line bg-muted-surface text-ink hover:border-brand">
            {/^https:\/\//i.test(message.context.image_url || "") && <Image src={message.context.image_url}
              alt={message.context.title || t("chat.sharedListing")} unoptimized width={440} height={240}
              className="max-h-44 w-full object-cover" />}
            <span className="block p-3"><strong className="block break-words text-sm">{message.context.title || t("chat.sharedListing")}</strong>
              {message.context.location && <span className="mt-1 block text-xs text-muted-ink">{message.context.location}</span>}
              <span className="mt-2 block text-xs font-semibold text-brand">{t("chat.openListing")}</span>
            </span>
          </Link> :
        message.type === "image" && media ? <a href={media} target="_blank" rel="noopener noreferrer"
          aria-label={t("chat.openImage")} className="block overflow-hidden rounded-2xl">
          <Image src={media} alt={t("chat.sentImage")} unoptimized
            width={message.context?.width || 480} height={message.context?.height || 360}
            className="h-auto max-h-96 max-w-full object-contain" />
        </a> : message.type === "audio" && media ?
          <audio controls preload="none" src={media} aria-label={t("chat.voiceMessage")}
            className="max-w-full" /> : message.type === "video" && media ?
          <video controls preload="metadata" src={media} aria-label={t("chat.shared.video")}
            className="max-h-96 max-w-full rounded-xl" /> :
          message.type === "file" ? <div className="space-y-1 rounded-2xl bg-muted-surface p-3">
            {(message.context?.files || []).map((file, index) => <a key={`${index}:${file.name}`}
              href={message.status ? undefined : chatApi.fileUrl(message.conversation_id, message.id, index)}
              aria-disabled={Boolean(message.status)}
              className="block max-w-full truncate text-sm font-semibold text-brand underline">
              {file.name || t("chat.sentFiles")}</a>)}
          </div> :
          <p className={`w-fit max-w-full whitespace-pre-wrap break-words rounded-[1.15rem] px-3.5 py-2 text-sm leading-6 ${mine ? "rounded-br-md bg-brand text-on-brand" : "rounded-bl-md bg-muted-surface text-ink"}`}>
            {["image", "audio", "video", "file", "shared_context"].includes(message.type)
              ? t(message.type === "image" ? "chat.sentImage" : message.type === "file" ? "chat.sentFiles" :
                message.type === "video" ? "chat.shared.video" :
                  message.type === "shared_context" ? "chat.sharedListing" : "chat.voiceMessage") : message.body}
          </p>}
      {link && !editing && <a href={link.href} target="_blank" rel="noopener noreferrer"
        className="mt-1 block max-w-full overflow-hidden rounded-xl border border-line bg-muted-surface p-3 text-xs text-ink hover:border-brand">
        <strong className="block truncate">{link.hostname}</strong>
        <span className="mt-1 block truncate text-muted-ink">{link.pathname === "/" ? link.href : `${link.pathname}${link.search}`}</span>
      </a>}
      {!message.recalled_at && reactions.length > 0 && <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : ""}`}>
        {reactions.map(([emoji, count]) => <button key={emoji} type="button" disabled={blocked || Boolean(message.status)}
          onClick={() => onReaction(message, emoji)} aria-label={`${emoji} ${count}`}
          className={`rounded-full border px-2 py-0.5 text-xs ${message.reactions.some((r) => r.user_id === userId && r.emoji === emoji)
            ? "border-brand bg-brand/10" : "border-line bg-muted-surface"}`}>{emoji} {count}</button>)}
      </div>}
      <div ref={actionsRef} className="relative mt-0.5 flex min-h-7 items-center gap-0.5 text-[11px] text-muted-ink">
        <time className="px-1" dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString(locale === "en" ? "en-US" : "vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>
        {message.edited_at && !message.recalled_at && <span className="px-1">{t("chat.edited")}</span>}
        {mine && message.status === "pending" && <span className="px-1">{t("chat.pending")}</span>}
        {mine && message.status === "failed" && <button type="button" disabled={blocked}
          className="px-1 font-semibold text-danger underline" onClick={() => onRetry(message)}>{t("chat.retrySend")}</button>}
        {canAct && <>
          <IconButton label={t("chat.reply")} onClick={() => onReply(message)}
            className="!h-7 !w-7 !border-0 !bg-transparent !text-muted-ink hover:!text-brand"><ArrowBendUpLeft aria-hidden size={16} /></IconButton>
          <IconButton label={t("chat.react")} aria-expanded={reactionOpen} aria-controls={`reactions-${message.id}`}
            onClick={() => { setActionOpen(false); setReactionOpen((open) => !open); }}
            className="!h-7 !w-7 !border-0 !bg-transparent !text-muted-ink hover:!text-brand"><Smiley aria-hidden size={17} /></IconButton>
          <IconButton ref={actionButtonRef} label={t("chat.messageActions")} aria-expanded={actionOpen}
            aria-controls={`actions-${message.id}`} onClick={() => { setReactionOpen(false); setActionOpen((open) => !open); }}
            className="!h-7 !w-7 !border-0 !bg-transparent !text-muted-ink hover:!text-brand"><DotsThree aria-hidden size={20} weight="bold" /></IconButton>
        </>}
        {reactionOpen && <div id={`reactions-${message.id}`} className={`absolute bottom-full z-20 mb-1 flex gap-1 rounded-full border border-line bg-surface p-1 shadow-soft ${mine ? "right-0" : "left-0"}`}
          aria-label={t("chat.react")}>
          {reactionChoices.map((emoji) => <button key={emoji} type="button" aria-label={`${t("chat.react")} ${emoji}`}
            onClick={() => { onReaction(message, emoji); setReactionOpen(false); }}
            className="rounded-full p-1 text-lg leading-none hover:bg-muted-surface">{emoji}</button>)}
        </div>}
        {actionOpen && <div id={`actions-${message.id}`} className={`absolute bottom-full z-20 mb-1 min-w-36 rounded-xl border border-line bg-surface p-1 text-sm text-ink shadow-float ${mine ? "right-0" : "left-0"}`}>
          {canChange && <button type="button" onClick={() => { setDraft(message.body || ""); setEditing(true); setActionOpen(false); }}
            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted-surface">{t("chat.editMessage")}</button>}
          <button type="button" onClick={() => { onPin(message, !pinned); setActionOpen(false); }}
            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted-surface">{t(pinned ? "chat.unpinMessage" : "chat.pinMessage")}</button>
          {canRecall && <button type="button" onClick={() => { onRecall(message); setActionOpen(false); }}
            className="block w-full rounded-lg px-3 py-2 text-left text-danger hover:bg-muted-surface">{t("chat.recallMessage")}</button>}
        </div>}
      </div>
    </div>
  </li>;
}
