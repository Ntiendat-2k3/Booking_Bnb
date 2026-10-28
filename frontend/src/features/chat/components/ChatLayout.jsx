"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useTranslations } from "@/i18n/LocaleProvider";
import { chatApi } from "../api/chatApi";
import { useConversations } from "../hooks/useConversations";
import { useChatSocket } from "../hooks/useChatSocket";
import ConversationList from "./ConversationList";
import ConversationView from "./ConversationView";

export default function ChatLayout() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const conversationId = typeof params?.conversationId === "string" ? params.conversationId : null;
  const listingId = conversationId ? null : searchParams.get("listing");
  const { user, isInitialized } = useSelector((state) => state.auth);
  const userId = user?.id;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userResult, setUserResult] = useState({ key: "", items: [], error: false });
  const normalizedSearch = search.trim();
  const userSearchKey = `${userId || ""}:${normalizedSearch}`;
  const userSearchEligible = Boolean(userId && normalizedSearch.length >= 2);
  const users = userSearchEligible && userResult.key === userSearchKey ? userResult.items : [];
  const userSearchError = userSearchEligible && userResult.key === userSearchKey && userResult.error;
  const [detail, setDetail] = useState(null);
  const [detailOwner, setDetailOwner] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const detailRequest = useRef(0);
  const [contactError, setContactError] = useState(null);
  const [contactBusy, setContactBusy] = useState(Boolean(listingId));
  const [contactAttempt, setContactAttempt] = useState(0);
  const contactRequest = useRef(null);
  const conversations = useConversations(userId, debouncedSearch);
  const reload = conversations.reload;
  const loadDetail = useCallback((silent = false) => {
    if (!userId || !conversationId) return Promise.resolve();
    const request = ++detailRequest.current;
    return chatApi.detail(conversationId).then((data) => {
      if (request !== detailRequest.current) return;
      setDetail(data); setDetailOwner(userId); setDetailError(null);
    }).catch((error) => {
      if (request !== detailRequest.current) return;
      if (!silent) { setDetailError(error); setDetail(null); setDetailOwner(userId); }
    });
  }, [userId, conversationId]);
  const connected = useChatSocket(userId, (event, data) => {
    if (["chat:message", "chat:message:update", "chat:conversation", "chat:read",
      "chat:presence", "chat:block"].includes(event) || (event === "connection" && data)) reload();
    if ((event === "chat:presence" && data?.user_id === detail?.other_id) ||
      (event === "chat:block" && [data?.user_id, data?.target_id].includes(detail?.other_id)) ||
      (event === "connection" && data && conversationId)) void loadDetail(true);
  });
  useEffect(() => { void loadDetail(); }, [loadDetail]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(normalizedSearch), 300);
    return () => window.clearTimeout(timer);
  }, [normalizedSearch]);
  useEffect(() => {
    if (!userSearchEligible) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      chatApi.searchUsers(normalizedSearch, controller.signal).then((results) => {
        if (active) setUserResult({ key: userSearchKey, items: results, error: false });
      }).catch(() => {
        if (active) setUserResult({ key: userSearchKey, items: [], error: true });
      });
    }, 300);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [userSearchEligible, normalizedSearch, userSearchKey]);
  useEffect(() => {
    if (!userId || !conversationId) return;
    const refresh = () => { if (document.visibilityState === "visible") void loadDetail(true); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [userId, conversationId, loadDetail]);
  useEffect(() => {
    if (!userId || !listingId) return;
    if (contactRequest.current?.listingId !== listingId || contactRequest.current?.userId !== userId) {
      contactRequest.current = { listingId, userId, key: crypto.randomUUID() };
    }
    let active = true;
    chatApi.contact(listingId, contactRequest.current.key).then((result) => {
      if (!active) return;
      contactRequest.current = null;
      window.sessionStorage.removeItem("booking-chat-next");
      router.replace(`/messages/${result.id}`);
    }).catch((error) => { if (active) setContactError(error); })
      .finally(() => { if (active) setContactBusy(false); });
    return () => { active = false; };
  }, [userId, listingId, router, contactAttempt]);
  const chooseUser = async (targetId) => {
    try {
      const result = await chatApi.createDirect(targetId);
      router.push(`/messages/${result.id}`);
      setContactError(null);
      void reload();
    } catch (error) { setContactError(error); }
  };
  if (!isInitialized) return <p role="status" className="py-12 text-center text-muted-ink">{t("common.loading")}</p>;
  if (!user) return <div className="mx-auto max-w-lg py-16 text-center"><h1 className="text-2xl font-bold">{t("chat.title")}</h1>
    <p className="mt-3 text-muted-ink">{t("chat.loginRequired")}</p><Link href="/login" className="mt-5 inline-block font-semibold text-brand underline">{t("navigation.login")}</Link></div>;
  return <div className="relative flex h-full w-full min-h-0 min-w-0 overflow-hidden bg-surface">
    <div className={`${conversationId ? "hidden md:flex" : "flex"} w-full min-w-0 md:w-80 md:shrink-0 lg:w-96`}>
      <ConversationList conversations={conversations.items} selectedId={conversationId} search={search} onSearch={setSearch}
        users={users} onChooseUser={chooseUser} userSearchError={userSearchError}
        loading={conversations.loading} error={conversations.error} hasMore={conversations.hasMore}
        onMore={conversations.loadMore} onRetry={reload} connected={connected} />
    </div>
    <div className={`${conversationId ? "flex" : "hidden md:flex"} min-w-0 flex-1`}>
      {conversationId ? (detailOwner === user.id && detail?.id === conversationId
        ? <ConversationView key={`${user.id}:${conversationId}`} conversation={detail} userId={user.id}
          userRole={user.role}
          onActivity={reload} onDetailChange={() => loadDetail(true)} />
        : <div className="m-auto p-6 text-center text-sm text-muted-ink">
          {detailOwner === user.id && detailError ? <><p role="alert">{detailError.status === 404 ? t("chat.notFound") : t("chat.loadFailed")}</p>
            <button type="button" onClick={() => void loadDetail()} className="mt-2 text-brand underline">{t("common.retry")}</button></>
            : t("common.loading")}</div>)
        : <div className="m-auto p-8 text-center text-muted-ink">{t("chat.selectConversation")}</div>}
    </div>
    {(contactBusy || contactError) && <div role={contactError ? "alert" : "status"}
      className="absolute bottom-4 left-4 rounded-xl bg-surface p-4 shadow-soft">
      {contactError ? t(listingId ? "chat.contactFailed" : "chat.loadFailed") : t("common.loading")}
      {contactError && listingId && <button type="button" className="ml-2 text-brand underline"
        onClick={() => { setContactError(null); setContactBusy(true); setContactAttempt((current) => current + 1); }}>
        {t("common.retry")}</button>}
    </div>}
  </div>;
}
