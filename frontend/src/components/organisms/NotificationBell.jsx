"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "@phosphor-icons/react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleProvider";
import Dropdown from "@/components/molecules/Dropdown";
import { useChatSocket } from "@/features/chat/hooks/useChatSocket";

export default function NotificationBell() {
  const user = useSelector((s) => s.auth.user);
  const userId = user?.id;
  const router = useRouter();
  const { locale, t } = useLocale();
  const [notificationState, setNotificationState] = useState({ userId: null, items: [] });
  const [refresh, setRefresh] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const notifications = notificationState.userId === userId ? notificationState.items : [];
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  useChatSocket(userId, (event, data) => {
    if ((event === "chat:message" && data?.sender_id !== userId) || event === "booking:status" ||
      (event === "call:state" && data?.status === "no_answer" && data?.callee_id === userId) ||
      (event === "connection" && data)) setRefresh((current) => current + 1);
  });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    async function load() {
      try {
        const res = await apiFetch("/api/v1/notifications/me");
        if (active) {
          const items = Array.isArray(res?.data)
            ? res.data.filter((notification) => notification.user_id === userId)
            : [];
          setNotificationState({ userId, items });
          setLoadError(false);
        }
      } catch (e) {
        if (active) setLoadError(true);
        if (active && e.status !== 401) {
          console.error("Failed to load notifications", e);
        }
      }
    }
    load();
    // Đồng bộ lại định kỳ trong lúc chưa có kết nối thời gian thực.
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId, refresh]);

  async function markAsRead(id) {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
      setNotificationState((current) => current.userId === userId
        ? { ...current, items: current.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)) }
        : current);
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllAsRead() {
    try {
      await apiFetch("/api/v1/notifications/read-all", { method: "PATCH" });
      setNotificationState((current) => current.userId === userId
        ? { ...current, items: current.items.map((n) => ({ ...n, is_read: true })) }
        : current);
    } catch (e) {
      console.error(e);
    }
  }

  /** Đường dẫn chỉ là gợi ý điều hướng; API đích vẫn kiểm quyền người dùng khi mở. */
  async function openNotification(notification, close) {
    if (!notification.is_read) await markAsRead(notification.id);
    const target = notification.resource_type === "conversation" && notification.resource_id
      ? `/messages/${encodeURIComponent(notification.resource_id)}`
      : notification.resource_type === "booking" ? "/trips"
        : notification.resource_type === "host_booking" ? "/host/dashboard" : null;
    if (target) {
      close();
      router.push(target);
    }
  }

  if (!userId) return null;

  return (
    <Dropdown
      label={t("navigation.notifications")}
      button={
        <span className="relative grid h-11 w-11 place-items-center rounded-full text-ink transition hover:bg-muted-surface">
          <Bell aria-hidden size={20} />
          <span className="sr-only">{t("navigation.notifications")}</span>
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand" />
            </span>
          )}
        </span>
      }
    >
      {({ close }) => (
        <div className="max-h-96 w-full max-w-[calc(100vw-2rem)] overflow-y-auto bg-surface p-2 sm:max-w-md">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-3 pb-2 pt-2">
            <h3 className="font-semibold text-ink">{t("notifications.title")}</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          
          <div className="flex flex-col gap-1 py-2">
            {loadError && <p role="alert" className="px-4 py-2 text-xs text-danger">{t("common.loadFailed")} <button type="button" className="underline" onClick={() => setRefresh((current) => current + 1)}>{t("common.retry")}</button></p>}
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-ink">
                {t("notifications.empty")}
              </div>
            ) : (
              notifications.map((n) => (
                <button type="button" role="menuitem"
                  key={n.id}
                  onClick={() => void openNotification(n, close)}
                  className={`min-h-11 w-full cursor-pointer rounded-xl px-3 py-3 text-left transition ${
                    n.is_read
                      ? "opacity-70 hover:bg-muted-surface"
                      : "bg-brand/5 hover:bg-brand/10"
                  }`}
                >
                  <div className="flex gap-3">
                    {!n.is_read && <div className="mt-2 h-2 w-2 rounded-full bg-brand shrink-0"></div>}
                    <div>
                      <h4 className={`text-sm ${!n.is_read ? "font-bold text-ink" : "font-semibold text-ink/80"}`}>
                        {n.title}
                      </h4>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-ink">{n.message}</p>
                      <span className="mt-1 block text-[10px] text-muted-ink/70">
                        {new Date(n.created_at).toLocaleDateString(
                          locale === "en" ? "en-US" : "vi-VN",
                          {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
