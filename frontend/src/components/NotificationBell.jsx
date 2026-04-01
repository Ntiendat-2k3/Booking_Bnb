"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import Dropdown from "./ui/Dropdown";

function BellIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

export default function NotificationBell() {
  const user = useSelector((s) => s.auth.user);
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
    // In a real app, you might use polling or websockets here
    const interval = setInterval(load, 60000); // 1 minute
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
      button={
        <div className="relative rounded-full p-2 hover:bg-slate-100 transition cursor-pointer">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
            </span>
          )}
        </div>
      }
    >
      {({ close }) => (
        <div className="w-80 max-h-96 overflow-y-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-md bg-white p-2">
          <div className="px-3 pb-2 pt-2 border-b flex justify-between items-center sticky top-0 bg-white z-10">
            <h3 className="font-semibold text-slate-900">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          
          <div className="py-2 flex flex-col gap-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Bạn không có thông báo nào.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                  }}
                  className={`px-3 py-3 rounded-xl cursor-pointer transition ${
                    n.is_read ? "opacity-70 hover:bg-slate-50" : "bg-blue-50/50 hover:bg-blue-50"
                  }`}
                >
                  <div className="flex gap-3">
                    {!n.is_read && <div className="mt-2 h-2 w-2 rounded-full bg-brand shrink-0"></div>}
                    <div>
                      <h4 className={`text-sm ${!n.is_read ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}>
                        {n.title}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{n.message}</p>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {new Date(n.created_at).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
