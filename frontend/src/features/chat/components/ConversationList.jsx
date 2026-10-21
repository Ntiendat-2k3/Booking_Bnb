"use client";

import ConversationItem from "./ConversationItem";
import ChatAvatar from "./ChatAvatar";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";

export default function ConversationList({ conversations, selectedId, search, onSearch,
  users, onChooseUser, userSearchError, loading, error, hasMore, onMore, onRetry, connected }) {
  const t = useTranslations();
  return <aside className="flex min-h-0 min-w-0 w-full flex-col border-r border-line bg-surface" aria-label={t("chat.conversations")}>
    <div className="border-b border-line px-4 pb-4 pt-5"><h1 className="text-2xl font-bold tracking-tight text-ink">{t("chat.title")}</h1>
      <label htmlFor="chat-search" className="sr-only">{t("chat.search")}</label>
      <div className="mt-4 flex h-11 items-center gap-2.5 rounded-full bg-muted-surface px-4 text-muted-ink focus-within:ring-2 focus-within:ring-brand/30">
        <MagnifyingGlass aria-hidden size={19} />
        <input id="chat-search" type="search" value={search} onChange={(event) => onSearch(event.target.value)}
          placeholder={t("chat.searchUsers")} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-ink" />
      </div>
      {!connected && <p role="status" className="mt-2 text-xs text-muted-ink">{t("chat.reconnecting")}</p>}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {userSearchError && <p role="alert" className="p-3 text-sm text-danger">{t("chat.loadFailed")}</p>}
      {users.length > 0 && <section aria-label={t("chat.searchUsers")} className="mb-4">
        <h2 className="px-3 py-2 text-xs font-semibold text-muted-ink">{t("chat.searchUsers")}</h2>
        <ul>{users.map((user) => <li key={user.id}><button type="button" onClick={() => onChooseUser(user.id)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted-surface">
          <ChatAvatar src={user.avatar_url} name={user.full_name} size={40} />
          <strong className="min-w-0 truncate text-sm text-ink">{user.full_name}</strong>
        </button></li>)}</ul>
      </section>}
      {loading && !conversations.length && <p role="status" className="p-4 text-sm text-muted-ink">{t("common.loading")}</p>}
      {error && <div role="alert" className="p-4 text-sm text-danger">{t("chat.loadFailed")} <button type="button" className="underline" onClick={onRetry}>{t("common.retry")}</button></div>}
      {!loading && !error && !conversations.length && !users.length &&
        <p className="p-4 text-sm text-muted-ink">{t(search ? "chat.noSearchResults" : "chat.emptyInbox")}</p>}
      <ul className="space-y-1">{conversations.map((conversation) => <li key={conversation.id}>
        <ConversationItem conversation={conversation} active={selectedId === conversation.id} />
      </li>)}</ul>
      {hasMore && <button type="button" disabled={loading} onClick={onMore}
        className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-brand hover:bg-muted-surface">{t("chat.loadMore")}</button>}
    </div>
  </aside>;
}
