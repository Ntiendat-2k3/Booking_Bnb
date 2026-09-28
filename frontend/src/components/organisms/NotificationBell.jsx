"use client";

import { useEffect, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleProvider";
import Dropdown from "@/components/molecules/Dropdown";

export default function NotificationBell() {
  const user = useSelector((s) => s.auth.user);
  const { locale, t } = useLocale();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const res = await apiFetch("/api/v1/notifications/me");
        if (res?.data) {
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n) => !n.is_read).length);
        }
      } catch (e) {
        if (e.status !== 401) {
          console.error("Failed to load notifications", e);
        }
      }
    }
    load();
    // Đồng bộ lại định kỳ trong lúc chưa có kết nối thời gian thực.
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [user]);

  async function markAsRead(id) {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllAsRead() {
    try {
      await apiFetch("/api/v1/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  }

  if (!user) return null;

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
      {() => (
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
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-ink">
                {t("notifications.empty")}
              </div>
            ) : (
              notifications.map((n) => (
                <button type="button" role="menuitem"
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                  }}
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
