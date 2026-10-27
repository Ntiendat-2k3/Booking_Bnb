"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarCheck, ChatCircleDots, House, GearSix } from "@phosphor-icons/react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleProvider";
import Dropdown from "@/components/molecules/Dropdown";
import { useChatSocket } from "@/features/chat/hooks/useChatSocket";
import { notificationTarget, relativeNotificationTime } from "@/features/notifications/notificationView.mjs";

const categories = ["all", "messages", "bookings", "listings", "system"];
const icons = { messages: ChatCircleDots, bookings: CalendarCheck, listings: House, system: GearSix };
const emptyMeta = { total_unread: 0, unread_by_category: {}, has_more: false, next_cursor: null };

export default function NotificationBell() {
  const userId = useSelector((state) => state.auth.user?.id);
  const router = useRouter();
  const { locale, t } = useLocale();
  const [activeTab, setActiveTab] = useState("all");
  const [refresh, setRefresh] = useState(0);
  const [feed, setFeed] = useState({ userId: null, category: "all", items: [], meta: emptyMeta, loading: true, error: false });
  const [actionError, setActionError] = useState(false);
  const currentFeed = feed.userId === userId && feed.category === activeTab ? feed : null;
  const items = currentFeed?.items || [];
  const meta = feed.userId === userId ? feed.meta : emptyMeta;

  useChatSocket(userId, (event, data) => {
    if ((event === "chat:message" && data?.sender_id !== userId) || event === "booking:status" ||
      (event === "call:state" && data?.status === "no_answer" && data?.callee_id === userId) ||
      (event === "connection" && data)) setRefresh((value) => value + 1);
  });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function load() {
      setFeed((previous) => ({
        userId, category: activeTab,
        items: previous.userId === userId && previous.category === activeTab ? previous.items : [],
        meta: previous.userId === userId ? previous.meta : emptyMeta,
        loading: true, error: false,
      }));
      try {
        const response = await apiFetch("/api/v1/notifications/feed", { params: { category: activeTab, limit: 20 } });
        if (active) setFeed({ userId, category: activeTab, items: response.data.items,
          meta: response.data.meta, loading: false, error: false });
      } catch (error) {
        if (active) setFeed((previous) => ({ ...previous, loading: false, error: true }));
        if (active && error.status !== 401) console.error("Failed to load notifications", error);
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => { active = false; clearInterval(interval); };
  }, [userId, activeTab, refresh]);

  async function loadMore() {
    if (!currentFeed?.meta.has_more || currentFeed.loading) return;
    const cursor = currentFeed.meta.next_cursor;
    setFeed((previous) => ({ ...previous, loading: true, error: false }));
    try {
      const response = await apiFetch("/api/v1/notifications/feed", {
        params: { category: activeTab, limit: 20, cursor },
      });
      setFeed((previous) => {
        if (previous.userId !== userId || previous.category !== activeTab || previous.meta.next_cursor !== cursor) return previous;
        const seen = new Set(previous.items.map((item) => item.id));
        return { ...previous, items: [...previous.items, ...response.data.items.filter((item) => !seen.has(item.id))],
          meta: response.data.meta, loading: false };
      });
    } catch (error) {
      setFeed((previous) => previous.userId === userId && previous.category === activeTab
        ? { ...previous, loading: false, error: true } : previous);
      console.error("Failed to load more notifications", error);
    }
  }

  async function markAsRead(notification) {
    if (notification.is_read) return;
    try {
      await apiFetch(`/api/v1/notifications/${notification.id}/read`, { method: "PATCH" });
      setFeed((previous) => {
        if (previous.userId !== userId) return previous;
        const unreadByCategory = { ...previous.meta.unread_by_category };
        unreadByCategory[notification.category] = Math.max(0, (unreadByCategory[notification.category] || 0) - 1);
        return { ...previous, items: previous.items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item),
          meta: { ...previous.meta, total_unread: Math.max(0, previous.meta.total_unread - 1), unread_by_category: unreadByCategory } };
      });
      setActionError(false);
    } catch {
      setActionError(true);
    }
  }

  async function markAllAsRead() {
    try {
      await apiFetch("/api/v1/notifications/read-all", { method: "PATCH" });
      setFeed((previous) => previous.userId === userId ? { ...previous,
        items: previous.items.map((item) => ({ ...item, is_read: true })),
        meta: { ...previous.meta, total_unread: 0,
          unread_by_category: { messages: 0, bookings: 0, listings: 0, system: 0 } },
      } : previous);
      setActionError(false);
    } catch {
      setActionError(true);
    }
  }

  async function openNotification(notification, close) {
    await markAsRead(notification);
    const target = notificationTarget(notification);
    if (target) { close(); router.push(target); }
  }

  if (!userId) return null;

  return (
    <Dropdown label={meta.total_unread > 0 ? t("notifications.unreadCount", { count: meta.total_unread }) : t("navigation.notifications")}
      widthClass="w-auto lg:w-[36rem]"
      placementClass="fixed inset-x-3 top-[calc(var(--header-height)+0.75rem)] lg:absolute lg:inset-x-auto lg:top-auto lg:right-0 lg:mt-2"
      button={
      <span className="relative grid h-11 w-11 place-items-center rounded-full text-ink transition hover:bg-muted-surface">
        <Bell aria-hidden size={20} />
        <span className="sr-only">{t("navigation.notifications")}</span>
        {meta.total_unread > 0 && <span className="absolute right-1 top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-on-danger">
          {meta.total_unread > 99 ? "99+" : meta.total_unread}
        </span>}
      </span>
    }>
      {({ close }) => <div className="max-h-[calc(100dvh-var(--header-height)-7rem)] overflow-y-auto bg-surface text-ink md:max-h-[min(70vh,640px)]">
        <div className="sticky top-0 z-10 bg-surface">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:flex-nowrap sm:gap-3 sm:px-5 sm:py-0">
            <h3 className="flex items-center gap-2 text-lg font-bold">{t("notifications.title")}
              {meta.total_unread > 0 && <span className="rounded-full bg-danger px-2 py-0.5 text-xs text-on-danger">{meta.total_unread}</span>}
            </h3>
            {meta.total_unread > 0 && <button type="button" role="menuitem" onClick={markAllAsRead}
              className="text-right text-xs font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">
              {t("notifications.markAllRead")}
            </button>}
          </div>
          <div role="group" aria-label={t("notifications.categories")} className="flex overflow-x-auto border-b border-line px-2 sm:px-3">
            {categories.map((category) => <button key={category} type="button" role="menuitem"
              aria-current={activeTab === category ? "true" : undefined} onClick={() => setActiveTab(category)}
              className={`shrink-0 border-b-2 px-2.5 py-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-brand sm:px-3 sm:text-sm ${
                activeTab === category ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink"
              }`}>{t(`notifications.tabs.${category}`)}</button>)}
          </div>
        </div>
        {actionError && <p role="alert" className="px-5 py-2 text-sm text-danger">{t("notifications.actionFailed")}</p>}
        {currentFeed?.error && <div role="alert" className="px-5 py-4 text-sm text-danger">
          {t("notifications.loadFailed")} <button type="button" role="menuitem" className="font-semibold underline"
            onClick={() => setRefresh((value) => value + 1)}>{t("common.retry")}</button>
        </div>}
        {!currentFeed || currentFeed.loading && items.length === 0 ?
          <p role="status" className="px-5 py-10 text-center text-sm text-muted-ink">{t("notifications.loading")}</p>
          : !currentFeed.error && items.length === 0 ?
            <p className="px-5 py-10 text-center text-sm text-muted-ink">{t(`notifications.emptyByCategory.${activeTab}`)}</p>
            : <div>{items.map((notification) => {
              const Icon = icons[notification.category] || GearSix;
              return <button key={notification.id} type="button" role="menuitem"
                aria-label={`${notification.title}. ${notification.message}. ${notification.is_read ? t("notifications.read") : t("notifications.unread")}`}
                onClick={() => void openNotification(notification, close)}
                className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-muted-surface focus-visible:outline-2 focus-visible:outline-brand sm:px-5 sm:py-4 ${
                  notification.is_read ? "bg-surface" : "bg-brand/10"
                }`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted-surface text-brand sm:h-11 sm:w-11"><Icon aria-hidden size={22} weight="fill" /></span>
                <span className="min-w-0 flex-1">
                  <span className={`line-clamp-2 text-sm text-ink ${notification.is_read ? "font-medium" : "font-bold"}`}>{notification.title}</span>
                  <span className="mt-1 line-clamp-3 text-sm leading-5 text-muted-ink">{notification.message}</span>
                  <span className="mt-1 block text-xs text-muted-ink">{relativeNotificationTime(notification.created_at, locale, t("notifications.justNow"))}</span>
                </span>
                {!notification.is_read && <span aria-hidden className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />}
              </button>;
            })}
              {currentFeed?.meta.has_more && <button type="button" role="menuitem" onClick={() => void loadMore()}
                disabled={currentFeed.loading} className="w-full px-5 py-3 text-center text-sm font-semibold text-brand hover:bg-muted-surface disabled:opacity-50">
                {currentFeed.loading ? t("notifications.loading") : t("notifications.loadMore")}</button>}
            </div>}
      </div>}
    </Dropdown>
  );
}
