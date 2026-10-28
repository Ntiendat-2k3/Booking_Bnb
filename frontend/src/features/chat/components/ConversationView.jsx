"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowLeft, DotsThree, ImageSquare, MagnifyingGlass, PushPin, UserCircle, VideoCamera, X } from "@phosphor-icons/react";
import IconButton from "@/components/atoms/IconButton";
import { useLocale } from "@/i18n/LocaleProvider";
import { chatApi } from "../api/chatApi";
import { useMessages } from "../hooks/useMessages";
import { useChatSocket } from "../hooks/useChatSocket";
import { useCallSession } from "../hooks/useCallSession";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import ChatAvatar from "./ChatAvatar";
import EmojiText from "./EmojiText";
import { canManageListings } from "@/lib/roles";

const sharedTypes = ["image", "video", "file", "link"];
const BookingProposalForm = dynamic(() => import("./BookingProposalForm"), { ssr: false });

/** Gộp lịch sử chat với các bảng đọc riêng cho hồ sơ, tìm kiếm, media và tin đã ghim. */
export default function ConversationView({ conversation, userId, userRole, onActivity, onDetailChange }) {
  const { t } = useLocale();
  const { call, busy: callBusy, startCall } = useCallSession();
  const { items, cursor, loading, olderLoading, error, reload, loadOlder, receive,
    receiveUpdate, receiveReaction, send } = useMessages(conversation.id);
  const [readError, setReadError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [proposalEditor, setProposalEditor] = useState(null);
  const [bookingRefresh, setBookingRefresh] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [panel, setPanel] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const searchPageRequest = useRef(null);
  const normalizedSearch = searchText.trim();
  const [sharedType, setSharedType] = useState("image");
  const [shared, setShared] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedPage, setSharedPage] = useState(1);
  const [sharedHasMore, setSharedHasMore] = useState(false);
  const [pins, setPins] = useState([]);
  const [panelError, setPanelError] = useState(false);
  const scrollRef = useRef(null);
  const atBottom = useRef(true);
  const previousHeight = useRef(null);
  const lastRead = useRef(null);
  const detailsRef = useRef(null);
  const detailsButtonRef = useRef(null);
  const blocked = conversation.blocked_by_me || conversation.blocked_me;
  const callDisabled = blocked || callBusy || Boolean(call && !call.ended_at);
  const refreshPins = useCallback(() => chatApi.pinnedMessages(conversation.id)
    .then((data) => { setPins(data); setPanelError(false); })
    .catch(() => setPanelError(true)), [conversation.id]);
  const connected = useChatSocket(userId, (event, data) => {
    if (event === "connection" && data) { reload(); void refreshPins(); }
    if (event === "chat:message" && data.conversation_id === conversation.id) {
      receive(data); onActivity();
      if (panel === "shared") void chatApi.sharedMessages(conversation.id, sharedType).then((page) => {
        setShared(page.items); setSharedPage(1); setSharedHasMore(page.hasMore);
      }).catch(() => setPanelError(true));
    }
    if (event === "chat:message:update" && data.conversation_id === conversation.id) {
      receiveUpdate(data); onActivity();
      if (replyTo?.id === data.id) setReplyTo(data.recalled_at ? null : data);
    }
    if (event === "chat:reaction" && data.conversation_id === conversation.id) receiveReaction(data);
    if (event === "chat:pin" && data.conversation_id === conversation.id) void refreshPins();
    if (event === "booking:status") setBookingRefresh((value) => value + 1);
  });

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (previousHeight.current !== null) {
      container.scrollTop += container.scrollHeight - previousHeight.current;
      previousHeight.current = null;
    } else if (atBottom.current) container.scrollTop = container.scrollHeight;
  }, [items]);
  useEffect(() => { void refreshPins(); }, [refreshPins]);
  useEffect(() => {
    if (!detailsOpen) return;
    detailsRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") { setDetailsOpen(false); detailsButtonRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detailsOpen]);
  useEffect(() => {
    if (panel !== "profile") return;
    let active = true;
    chatApi.publicProfile(conversation.other_id).then((data) => {
      if (active) { setProfile(data); setPanelError(false); }
    }).catch(() => { if (active) setPanelError(true); });
    return () => { active = false; };
  }, [panel, conversation.other_id]);
  useEffect(() => {
    if (!detailsOpen || panel !== "search" || normalizedSearch.length < 2) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      chatApi.searchMessages(conversation.id, normalizedSearch, 1, controller.signal).then((page) => {
        if (active) { setResults(page.items); setSearchPage(1);
          setSearchHasMore(page.hasMore); setSearchLoading(false); setPanelError(false); }
      }).catch(() => { if (active) { setSearchLoading(false); setPanelError(true); } });
    }, 250);
    return () => {
      active = false; controller.abort(); window.clearTimeout(timer);
      searchPageRequest.current?.abort(); searchPageRequest.current = null;
    };
  }, [detailsOpen, panel, conversation.id, normalizedSearch]);
  useEffect(() => {
    if (panel !== "shared") return;
    let active = true;
    chatApi.sharedMessages(conversation.id, sharedType).then((page) => {
      if (active) { setShared(page.items); setSharedPage(1);
        setSharedHasMore(page.hasMore); setSharedLoading(false); setPanelError(false); }
    }).catch(() => { if (active) { setSharedLoading(false); setPanelError(true); } });
    return () => { active = false; };
  }, [panel, conversation.id, sharedType]);

  const lastMessage = items[items.length - 1];
  const markLatestRead = useCallback(() => {
    if (!lastMessage?.id || lastMessage.status || !atBottom.current || lastMessage.id === lastRead.current) return;
    lastRead.current = lastMessage.id;
    chatApi.read(conversation.id, lastMessage.id).then(() => { setReadError(false); onActivity(); })
      .catch(() => { lastRead.current = null; setReadError(true); });
  }, [conversation.id, lastMessage, onActivity]);
  useEffect(() => { markLatestRead(); }, [markLatestRead]);
  const older = async () => {
    previousHeight.current = scrollRef.current?.scrollHeight ?? null;
    await loadOlder();
  };
  const submit = async (draft) => {
    const sent = await send(userId, draft);
    if (sent) { setReplyTo(null); onActivity(); }
    return sent;
  };
  const proposalSaved = (result) => {
    if (result.message) {
      if (proposalEditor?.id) receiveUpdate(result.message);
      else receive(result.message);
    } else void reload();
    setProposalEditor(null); onActivity();
  };
  const reactTo = async (message, emoji) => {
    const active = !(message.reactions || []).some((reaction) => reaction.user_id === userId && reaction.emoji === emoji);
    try { receiveReaction(await chatApi.setReaction(conversation.id, message.id, emoji, active)); setActionError(null); }
    catch { setActionError("chat.reactionFailed"); }
  };
  const editMessage = async (message, body) => {
    try { receiveUpdate(await chatApi.editMessage(conversation.id, message.id, body));
      setActionError(null); onActivity(); return true;
    } catch { setActionError("chat.actionFailed"); return false; }
  };
  const recallMessage = async (message) => {
    try { receiveUpdate(await chatApi.recallMessage(conversation.id, message.id));
      setActionError(null); onActivity(); void refreshPins();
    } catch { setActionError("chat.actionFailed"); }
  };
  const pinMessage = async (message, pinned) => {
    try { await chatApi.setMessagePin(conversation.id, message.id, pinned);
      setActionError(null); await refreshPins();
    } catch { setActionError("chat.actionFailed"); }
  };
  const toggleBlock = async () => {
    try {
      await chatApi.setUserBlock(conversation.other_id, !profile?.blocked_by_me);
      setProfile(await chatApi.publicProfile(conversation.other_id));
      onDetailChange();
      setActionError(null);
    } catch { setActionError("chat.actionFailed"); }
  };
  const moreSearch = async () => {
    if (searchLoading || !searchHasMore || searchPageRequest.current) return;
    const controller = new AbortController();
    searchPageRequest.current = controller;
    try {
      const page = await chatApi.searchMessages(conversation.id, normalizedSearch, searchPage + 1, controller.signal);
      if (controller.signal.aborted) return;
      setResults((current) => [...current, ...page.items]); setSearchPage(page.page);
      setSearchHasMore(page.hasMore); setPanelError(false);
    } catch { if (!controller.signal.aborted) setPanelError(true); }
    finally { if (searchPageRequest.current === controller) searchPageRequest.current = null; }
  };
  const moreShared = async () => {
    try {
      const page = await chatApi.sharedMessages(conversation.id, sharedType, sharedPage + 1);
      setShared((current) => [...current, ...page.items]); setSharedPage(page.page);
      setSharedHasMore(page.hasMore); setPanelError(false);
    } catch { setPanelError(true); }
  };
  const online = conversation.other_online === true && !blocked;
  const presenceLabel = t(online ? "chat.online" : "chat.offline");
  const pinnedIds = new Set(pins.map((message) => message.id));
  const latestPinned = pins[0];
  const pinPreview = (message) => message.context?.title || message.body ||
    t(message.type === "image" ? "chat.sentImage" : message.type === "audio" ? "chat.voiceMessage" :
      message.type === "video" ? "chat.shared.video" : message.type === "shared_context" ? "chat.sharedListing" : "chat.sentFiles");
  const selectPanel = (name) => {
    if (name === panel) return;
    setPanel(name); setPanelError(false);
    if (name === "search") {
      setResults([]); setSearchPage(1); setSearchHasMore(false);
      setSearchLoading(searchText.trim().length >= 2);
    }
    if (name === "shared") {
      setShared([]); setSharedPage(1); setSharedHasMore(false); setSharedLoading(true);
    }
  };
  const openProfile = () => { selectPanel("profile"); setDetailsOpen(true); };
  return <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface" aria-label={t("chat.conversationWith", { name: conversation.other_name })}>
    <header className="flex min-h-[4.5rem] shrink-0 items-center gap-3 border-b border-line px-3 sm:px-5">
      <Link href="/messages" className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted-surface md:hidden"
        aria-label={t("chat.backToInbox")}><ArrowLeft aria-hidden size={21} /></Link>
      <button type="button" onClick={openProfile} className="shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-brand"
        aria-label={t("chat.viewProfile")}><ChatAvatar src={conversation.other_avatar} name={conversation.other_name}
          size={42} online={online} statusLabel={presenceLabel} /></button>
      <button type="button" onClick={openProfile} className="min-w-0 flex-1 text-left">
        <h2 className="truncate font-semibold text-ink">{conversation.other_name}</h2>
        <p role="status" className="truncate text-xs text-muted-ink">{!connected ? t("chat.reconnecting") : presenceLabel}</p>
      </button>
      <IconButton label={t("chat.videoCall")} title={t("chat.videoCall")}
        disabled={callDisabled} onClick={() => void startCall(conversation.id)}
        className="!h-10 !w-10 !border-0 !bg-muted-surface !text-brand"><VideoCamera aria-hidden size={23} weight="fill" /></IconButton>
      <IconButton ref={detailsButtonRef} label={t("chat.details")} title={t("chat.details")}
        aria-expanded={detailsOpen} aria-controls="chat-details" onClick={() => { setPanel("profile"); setDetailsOpen((open) => !open); }}
        className={`!h-10 !w-10 !border-0 !text-brand ${detailsOpen ? "!bg-brand/15" : "!bg-muted-surface"}`}>
        <DotsThree aria-hidden size={25} weight="bold" />
      </IconButton>
    </header>
    {latestPinned && <button type="button" onClick={() => { setPanel("pins"); setDetailsOpen(true); }}
      aria-label={`${t("chat.panel.pins")} (${pins.length})`}
      className="flex min-h-14 w-full shrink-0 items-center gap-3 border-b border-line bg-muted-surface/60 px-4 text-left transition hover:bg-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:px-6">
      <PushPin aria-hidden size={19} weight="fill" className="shrink-0 text-brand" />
      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-brand">{t("chat.panel.pins")}</span>
        <span className="block truncate text-sm text-ink"><EmojiText text={pinPreview(latestPinned)} /></span></span>
      {pins.length > 1 && <span aria-hidden className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted-ink">{pins.length}</span>}
    </button>}
    <div className="flex min-h-0 flex-1">
    <div className={`${detailsOpen ? "hidden xl:flex" : "flex"} min-w-0 flex-1 flex-col`}>
    <div ref={scrollRef} onScroll={(event) => {
      const element = event.currentTarget;
      atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      if (atBottom.current) markLatestRead();
    }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-canvas/45 px-3 py-5 sm:px-6" aria-live="polite">
      {cursor && <button type="button" disabled={olderLoading} onClick={older}
        className="mb-4 w-full py-2 text-sm font-semibold text-brand hover:underline">{t("chat.loadOlder")}</button>}
      {loading && <p role="status" className="text-sm text-muted-ink">{t("common.loading")}</p>}
      {error && <p role="alert" className="text-sm text-danger">{t("chat.loadFailed")} <button type="button" onClick={reload}
        className="underline">{t("common.retry")}</button></p>}
      {!loading && !error && !items.length && <p className="py-10 text-center text-sm text-muted-ink">{t("chat.emptyConversation")}</p>}
      <ol className="flex flex-col gap-4">{items.map((message) => <MessageBubble key={message.id} message={message}
        mine={message.sender_id === userId} userId={userId} otherName={conversation.other_name}
        otherAvatar={conversation.other_avatar} onCallAgain={() => void startCall(conversation.id)}
        callDisabled={callDisabled}
        onReply={setReplyTo} onReaction={reactTo} onEdit={editMessage} onRecall={recallMessage}
        onPin={pinMessage} pinned={pinnedIds.has(message.id)} blocked={blocked}
        canSupportBooking={canManageListings(userRole) && !blocked}
        onSupportBooking={(listingId) => setProposalEditor({ initialListingId: listingId })}
        bookingRefresh={bookingRefresh} onProposalUpdate={receiveUpdate}
        onEditProposal={setProposalEditor}
        onRetry={(item) => send(userId, item)} />)}</ol>
      {readError && <p role="alert" className="mt-3 text-center text-xs text-danger">{t("chat.readFailed")}</p>}
      {actionError && <p role="alert" className="mt-3 text-center text-xs text-danger">{t(actionError)}</p>}
    </div>
    {blocked && <p role="status" className="border-t border-line p-3 text-center text-sm text-muted-ink">
      {t("chat.blockedConversation")}</p>}
    <MessageComposer onSend={submit} replyTo={replyTo} disabled={blocked}
      canSupportBooking={canManageListings(userRole)} onSupportBooking={() => setProposalEditor({})}
      replyName={replyTo?.sender_id === userId ? t("chat.you") : replyTo?.sender_name || conversation.other_name}
      onClearReply={() => setReplyTo(null)} />
    {proposalEditor && <BookingProposalForm key={`${conversation.id}:${proposalEditor.id || proposalEditor.initialListingId || "new"}`}
      conversationId={conversation.id} initialListingId={proposalEditor.initialListingId}
      proposal={proposalEditor.id ? proposalEditor : null} onSaved={proposalSaved}
      onClose={() => setProposalEditor(null)} />}
    </div>
    {detailsOpen && <aside ref={detailsRef} id="chat-details" tabIndex={-1}
      className="flex min-h-0 w-full shrink-0 flex-col bg-surface outline-none xl:w-80 xl:border-l xl:border-line"
      aria-label={t("chat.details")}>
      <div className="flex min-h-14 items-center justify-between border-b border-line px-4">
        <h3 className="text-sm font-semibold text-ink">{t("chat.details")}</h3>
        <IconButton label={t("chat.closeDetails")} onClick={() => { setDetailsOpen(false); detailsButtonRef.current?.focus(); }}
          className="!h-8 !w-8 !border-0 !bg-transparent"><X aria-hidden size={18} /></IconButton>
      </div>
      <div className="border-b border-line px-4 py-5 text-center">
        <div className="flex justify-center"><ChatAvatar src={conversation.other_avatar} name={conversation.other_name}
          size={64} online={online} statusLabel={presenceLabel} /></div>
        <p className="mt-3 truncate font-semibold text-ink">{conversation.other_name}</p>
        <p className="text-xs text-muted-ink">{presenceLabel}</p>
      </div>
      <nav className="grid gap-0.5 border-b border-line p-2" aria-label={t("chat.details")}>
        {[["profile", UserCircle], ["search", MagnifyingGlass], ["shared", ImageSquare], ["pins", PushPin]].map(([name, Icon]) =>
          <button key={name} type="button" onClick={() => selectPanel(name)}
            aria-pressed={panel === name}
            className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand ${panel === name ? "bg-muted-surface text-brand" : "text-ink hover:bg-muted-surface/70"}`}>
            <Icon aria-hidden size={19} /><span>{t(`chat.panel.${name}`)}</span>
          </button>)}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-ink">
        {panelError && <p role="alert" className="mb-3 text-danger">{t("chat.loadFailed")}</p>}
        {panel === "profile" && (profile ? <div className="space-y-4">
          {(profile.location || profile.email || profile.phone || profile.about) && <dl className="space-y-3 rounded-xl bg-muted-surface p-4">
            {profile.location && <div><dt className="text-xs text-muted-ink">{t("profile.location")}</dt>
              <dd className="mt-1 break-words">{profile.location}</dd></div>}
            {profile.email && <div><dt className="text-xs text-muted-ink">{t("contact.email")}</dt>
              <dd className="mt-1 break-all">{profile.email}</dd></div>}
            {profile.phone && <div><dt className="text-xs text-muted-ink">{t("profile.phone")}</dt>
              <dd className="mt-1 break-words">{profile.phone}</dd></div>}
            {profile.about && <div><dt className="text-xs text-muted-ink">{t("profile.about")}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">{profile.about}</dd></div>}
          </dl>}
          <button type="button" onClick={toggleBlock} className="rounded-lg px-1 py-2 font-semibold text-danger hover:underline">
            {t(profile.blocked_by_me ? "chat.unblockUser" : "chat.blockUser")}</button>
        </div> : !panelError && <p className="text-muted-ink">{t("common.loading")}</p>)}
        {panel === "search" && <>
          <label htmlFor="chat-content-search" className="sr-only">{t("chat.searchMessages")}</label>
          <input id="chat-content-search" type="search" value={searchText} onChange={(event) => {
            const value = event.target.value;
            setSearchText(value);
            if (value.trim() === normalizedSearch) return;
            setResults([]); setSearchPage(1); setSearchHasMore(false);
            setSearchLoading(value.trim().length >= 2); setPanelError(false);
          }}
            placeholder={t("chat.searchMessages")} className="field-control w-full" />
          <ul className="mt-3 space-y-2">{results.map((message) => <li key={message.id}
            className="rounded-xl bg-muted-surface p-3"><time className="block text-xs text-muted-ink"
              dateTime={message.created_at}>{new Date(message.created_at).toLocaleString("en-GB")}</time>
            <p className="mt-1 whitespace-pre-wrap break-words"><EmojiText text={message.body} /></p></li>)}</ul>
          {searchLoading && <p role="status" className="mt-4 text-muted-ink">{t("common.loading")}</p>}
          {searchText.trim().length >= 2 && !results.length && !searchLoading && !panelError && <p className="mt-4 text-muted-ink">{t("chat.noMessageResults")}</p>}
          {searchHasMore && <button type="button" onClick={moreSearch} className="mt-3 font-semibold text-brand hover:underline">{t("chat.loadMore")}</button>}
        </>}
        {panel === "shared" && <>
          <div className="flex flex-wrap gap-1.5">{sharedTypes.map((type) => <button key={type} type="button"
            onClick={() => {
              if (type === sharedType) return;
              setSharedType(type); setShared([]); setSharedPage(1); setSharedHasMore(false);
              setSharedLoading(true); setPanelError(false);
            }} aria-pressed={sharedType === type}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${sharedType === type ? "bg-brand text-on-brand" : "bg-muted-surface text-ink hover:bg-line"}`}>
            {t(`chat.shared.${type}`)}</button>)}</div>
          {sharedLoading && <p role="status" className="mt-4 text-muted-ink">{t("common.loading")}</p>}
          {!shared.length && !sharedLoading && !panelError && <p className="mt-4 text-muted-ink">{t("chat.noShared")}</p>}
          <ul className={`mt-3 ${sharedType === "image" ? "grid grid-cols-2 gap-2" : "space-y-2"}`}>
            {shared.map((message) => <li key={message.id} className="min-w-0 overflow-hidden rounded-xl bg-muted-surface">
              {message.type === "image" ? <a href={chatApi.mediaUrl(conversation.id, message.id)} target="_blank" rel="noopener noreferrer"
                aria-label={t("chat.openImage")} className="block">
                <Image src={chatApi.mediaUrl(conversation.id, message.id)} alt={t("chat.sentImage")}
                  unoptimized width={160} height={120} className="h-28 w-full object-cover" />
              </a> : message.type === "file" ? (message.context?.files || []).map((file, index) =>
                <a key={index} href={chatApi.fileUrl(conversation.id, message.id, index)}
                  className="block break-words px-3 pt-3 font-medium text-brand underline">{file.name || t("chat.sentFiles")}</a>)
                : message.type === "text" ? <a href={message.body?.match(/https?:\/\/[^\s<>]+/i)?.[0]}
                  target="_blank" rel="noopener noreferrer" className="block break-words px-3 pt-3 font-medium text-brand underline">
                  <EmojiText text={message.body} /></a>
                  : <video controls preload="metadata" src={chatApi.mediaUrl(conversation.id, message.id)}
                    aria-label={t("chat.shared.video")} className="max-h-36 w-full rounded-lg" />}
              <time className="block px-3 py-2 text-[11px] text-muted-ink" dateTime={message.created_at}>
                {new Date(message.created_at).toLocaleDateString("en-GB")}</time>
            </li>)}</ul>
          {sharedHasMore && <button type="button" onClick={moreShared} className="mt-3 font-semibold text-brand hover:underline">{t("chat.loadMore")}</button>}
        </>}
        {panel === "pins" && <>
          {!pins.length && !panelError && <p className="text-muted-ink">{t("chat.noPins")}</p>}
          <ul className="space-y-2">{pins.map((message) => <li key={message.id}
            className="rounded-xl bg-muted-surface p-3"><p className="break-words"><EmojiText text={pinPreview(message)} /></p>
            {!blocked && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
              <button type="button" onClick={() => void pinMessage(message, false)} className="text-brand hover:underline">
                {t("chat.unpinMessage")}</button>
              {message.sender_id === userId && <button type="button" onClick={() => void recallMessage(message)}
                className="text-danger hover:underline">{t("chat.recallMessage")}</button>}
            </div>}</li>)}</ul>
        </>}
      </div>
    </aside>}
    </div>
  </section>;
}
