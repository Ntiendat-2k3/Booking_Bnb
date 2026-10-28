"use client";

import { useEffect, useRef, useState } from "react";
import { chatApi } from "../api/chatApi";

const listeners = new Set();
let socket;
let socketUserId;

function broadcast(event, data) {
  for (const listener of listeners) listener(event, data);
}

function getSocket(userId, io) {
  if (socket && socketUserId !== userId) {
    socket.disconnect();
    socket = undefined;
  }
  if (socket) return socket;
  socketUserId = userId;
  const url = process.env.NEXT_PUBLIC_REALTIME_URL ||
    (process.env.NODE_ENV === "production" ? "https://booking-bnb-api.onrender.com" :
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000");
  socket = io(`${url}/chat`, { path: "/socket.io", transports: ["websocket"],
    withCredentials: true, autoConnect: false,
    auth: (callback) => chatApi.socketTicket().then((ticket) => callback({ ticket }))
      .catch(() => callback({})) });
  const connection = socket;
  let retryTimer;
  const scheduleRetry = () => {
    if (retryTimer) return;
    retryTimer = window.setTimeout(() => {
      retryTimer = undefined;
      if (socket === connection && listeners.size && !connection.connected) connection.connect();
    }, 5000);
  };
  socket.on("connect", () => broadcast("connection", true));
  socket.on("disconnect", (reason) => {
    broadcast("connection", false);
    if (reason === "io server disconnect") scheduleRetry();
  });
  socket.on("chat:message", (data) => broadcast("chat:message", data));
  socket.on("chat:message:update", (data) => broadcast("chat:message:update", data));
  socket.on("chat:reaction", (data) => broadcast("chat:reaction", data));
  socket.on("chat:conversation", (data) => broadcast("chat:conversation", data));
  socket.on("chat:pin", (data) => broadcast("chat:pin", data));
  socket.on("chat:block", (data) => broadcast("chat:block", data));
  socket.on("chat:read", (data) => broadcast("chat:read", data));
  socket.on("chat:presence", (data) => broadcast("chat:presence", data));
  socket.on("booking:status", (data) => broadcast("booking:status", data));
  socket.on("call:state", (data) => broadcast("call:state", data));
  for (const event of ["webrtc:offer", "webrtc:answer", "webrtc:ice-candidate"]) {
    socket.on(event, (data) => broadcast(event, data));
  }
  socket.on("connect_error", () => {
    broadcast("connection", false);
    if (!connection.active) scheduleRetry();
  });
  return socket;
}

/** Gửi signaling qua socket đã xác thực đang được các màn hình dùng chung. */
export function emitChatSocket(event, payload) {
  if (!socket?.connected) return Promise.reject(new Error("Socket disconnected"));
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (error, response) => {
      if (error || !response?.ok) reject(new Error(response?.error || "Signaling failed"));
      else resolve();
    });
  });
}

/** Sự kiện chỉ báo thay đổi; sau reconnect mỗi màn hình tải lại dữ liệu chuẩn từ API. */
export function useChatSocket(userId, onEvent) {
  const callback = useRef(onEvent);
  const [connected, setConnected] = useState(false);
  useEffect(() => { callback.current = onEvent; }, [onEvent]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let dispose;
    // Khách chưa đăng nhập không cần tải thư viện realtime; kiểm tra lại vòng đời trước khi mở kết nối.
    import("socket.io-client").then(({ io }) => {
      if (!active) return;
      const connection = getSocket(userId, io);
      const listener = (event, data) => {
        if (event === "connection") setConnected(data);
        callback.current?.(event, data);
      };
      listeners.add(listener);
      dispose = () => {
        listeners.delete(listener);
        if (!listeners.size && socket === connection) {
          connection.disconnect(); socket = undefined; socketUserId = undefined;
        }
      };
      listener("connection", connection.connected);
      if (!connection.connected) connection.connect();
    }).catch(() => { if (active) setConnected(false); });
    return () => {
      active = false;
      dispose?.();
    };
  }, [userId]);
  return connected;
}
