"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { chatApi } from "../api/chatApi";
import { useChatSocket } from "./useChatSocket";
import { useWebRTCCall } from "./useWebRTCCall";
import CallOverlay from "../components/CallOverlay";
import { isTerminalCall, mergeCallState } from "../utils/mergeCallState.mjs";

const CallContext = createContext(null);

/** Giữ một call canonical cho toàn website; event trễ không được hồi sinh call đã kết thúc. */
export function CallSessionProvider({ children }) {
  const userId = useSelector((state) => state.auth.user?.id);
  const [instanceId] = useState(() => crypto.randomUUID());
  const [call, setCall] = useState(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState(null);
  const callRef = useRef(null);
  const currentUser = useRef(userId);
  const previousUser = useRef(userId);
  const requestRef = useRef(0);
  const actionRef = useRef(0);
  useEffect(() => { currentUser.current = userId; }, [userId]);

  const apply = useCallback((next) => {
    if (next && next.caller_id !== currentUser.current && next.callee_id !== currentUser.current) return;
    const merged = mergeCallState(callRef.current, next);
    if (merged === callRef.current) return;
    callRef.current = merged;
    setCall(merged);
  }, []);

  const report = useCallback(async (callId, connection) => {
    try {
      apply(await chatApi.reportCall(callId, instanceId, connection));
    } catch { setError("sync"); }
  }, [apply, instanceId]);
  const rtc = useWebRTCCall(call, instanceId, report);
  const { stop, startMedia, startOffer, receive, mediaReady } = rtc;

  const reconcile = useCallback(async () => {
    if (!userId) return;
    const request = ++requestRef.current;
    try {
      const active = await chatApi.activeCall();
      if (request !== requestRef.current) return;
      if (active) apply(active);
      else if (callRef.current && !isTerminalCall(callRef.current)) {
        const latest = await chatApi.getCall(callRef.current.id);
        if (request === requestRef.current) apply(latest);
      }
    } catch { if (request === requestRef.current) setError("sync"); }
  }, [userId, apply]);

  useChatSocket(userId, (event, data) => {
    if (event === "chat:block" && data?.blocked && callRef.current &&
      [callRef.current.caller_id, callRef.current.callee_id].includes(data.user_id) &&
      [callRef.current.caller_id, callRef.current.callee_id].includes(data.target_id)) {
      const activeId = callRef.current.id;
      stop(); callRef.current = null; setCall(null);
      void chatApi.endCall(activeId).catch(() => {});
    }
    if (event === "connection" && data) {
      void reconcile();
      void rtc.resendSignaling();
    }
    if (event === "call:state") apply(data);
    if (event.startsWith("webrtc:")) void receive(event, data);
  });

  // Đổi tài khoản phải xóa call cũ và dừng track ngay trong cùng lần đồng bộ phiên.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (previousUser.current !== userId) {
      previousUser.current = userId;
      requestRef.current++;
      actionRef.current++;
      busyRef.current = false;
      setBusy(false);
      callRef.current = null;
      setCall(null);
      stop();
    }
    if (!userId) {
      requestRef.current++;
      callRef.current = null;
      setCall(null);
      stop();
      return;
    }
    void reconcile();
  }, [userId, reconcile, stop]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isTerminalCall(call)) stop();
  }, [call, stop]);

  useEffect(() => {
    if (call && call.caller_id === userId && call.caller_instance_id === instanceId &&
      ["connecting", "connected"].includes(call.status) && mediaReady) {
      void startOffer(call);
    }
  }, [call, userId, instanceId, mediaReady, startOffer]);

  const act = useCallback(async (action, current, needsMedia = false) => {
    if (!current || busyRef.current) return;
    busyRef.current = true;
    const operation = ++actionRef.current;
    setBusy(true); setError(null);
    try {
      const next = await (action === "accept"
        ? chatApi.acceptCall(current.id, instanceId)
        : action === "decline" ? chatApi.declineCall(current.id)
          : action === "cancel" ? chatApi.cancelCall(current.id) : chatApi.endCall(current.id));
      if (operation !== actionRef.current) return;
      apply(next);
      if (needsMedia) await startMedia(next);
    } catch { if (operation === actionRef.current) { setError("action"); void reconcile(); } }
    finally {
      if (operation === actionRef.current) {
        if (!needsMedia) stop();
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, [apply, startMedia, stop, reconcile, instanceId]);

  const startCall = useCallback(async (conversationId) => {
    if (busyRef.current || (callRef.current && !isTerminalCall(callRef.current))) return;
    busyRef.current = true;
    const operation = ++actionRef.current;
    setBusy(true); setError(null);
    try {
      const created = await chatApi.createCall(conversationId, instanceId);
      if (operation !== actionRef.current) return;
      apply(created);
      await startMedia(created);
    } catch { if (operation === actionRef.current) { setError("action"); void reconcile(); } }
    finally { if (operation === actionRef.current) { busyRef.current = false; setBusy(false); } }
  }, [apply, startMedia, reconcile, instanceId]);

  const retryAudioOnly = useCallback(async () => {
    if (call && !isTerminalCall(call)) await startMedia(call, true);
  }, [call, startMedia]);
  const dismiss = useCallback(() => {
    if (isTerminalCall(call)) {
      callRef.current = null;
      setCall(null);
      setError(null);
    }
  }, [call]);

  const value = { call, busy, error, instanceId, userId, rtc,
    startCall, accept: () => act("accept", call, true), decline: () => act("decline", call),
    cancel: () => act("cancel", call), end: () => act("end", call),
    retryAudioOnly, dismiss, reconcile };
  return <CallContext.Provider value={value}>{children}<CallOverlay session={value} /></CallContext.Provider>;
}

export function useCallSession() {
  const value = useContext(CallContext);
  if (!value) throw new Error("CallSessionProvider is missing");
  return value;
}
