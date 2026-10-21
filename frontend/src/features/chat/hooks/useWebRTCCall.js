"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emitChatSocket } from "./useChatSocket";

const iceServers = (process.env.NEXT_PUBLIC_WEBRTC_STUN_URLS || "")
  .split(",").map((url) => url.trim()).filter(Boolean).map((urls) => ({ urls }));

/** Sở hữu đúng một peer và các local track của call đang mở; signaling đến sớm được xếp hàng. */
export function useWebRTCCall(call, instanceId, onReport) {
  const reportRef = useRef(onReport);
  const callRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingSignalsRef = useRef([]);
  const pendingIceRef = useRef([]);
  const seenIceRef = useRef(new Set());
  const localIceRef = useRef([]);
  const offerSentRef = useRef(false);
  const heartbeatRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [connectionState, setConnectionState] = useState("idle");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [audioOnly, setAudioOnly] = useState(false);
  useEffect(() => { reportRef.current = onReport; }, [onReport]);

  const stop = useCallback((silent = false) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    callRef.current = null;
    pendingSignalsRef.current = [];
    pendingIceRef.current = [];
    seenIceRef.current.clear();
    localIceRef.current = [];
    offerSentRef.current = false;
    if (!silent) {
      setMediaReady(false); setConnectionState("idle"); setMediaError(null);
      setMicEnabled(true); setCameraEnabled(true); setAudioOnly(false);
    }
  }, []);

  const flushIce = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer?.remoteDescription) return;
    const queue = pendingIceRef.current.splice(0);
    for (const candidate of queue) await peer.addIceCandidate(candidate);
  }, []);

  const receive = useCallback(async (event, payload) => {
    if (payload?.target_instance_id !== instanceId) return;
    if (!callRef.current) {
      if (pendingSignalsRef.current.length < 100) pendingSignalsRef.current.push([event, payload]);
      return;
    }
    if (payload.call_id !== callRef.current.id) return;
    const peer = peerRef.current;
    if (!peer) {
      if (pendingSignalsRef.current.length < 100) pendingSignalsRef.current.push([event, payload]);
      return;
    }
    try {
      if (event === "webrtc:ice-candidate") {
        const key = JSON.stringify(payload.candidate);
        if (seenIceRef.current.has(key)) return;
        if (seenIceRef.current.size < 1000) seenIceRef.current.add(key);
        if (peer.remoteDescription) await peer.addIceCandidate(payload.candidate);
        else pendingIceRef.current.push(payload.candidate);
        return;
      }
      if (event === "webrtc:offer") {
        if (peer.remoteDescription?.sdp === payload.description.sdp) {
          if (peer.localDescription?.type === "answer") {
            await emitChatSocket("webrtc:answer", { call_id: payload.call_id, instance_id: instanceId,
              description: peer.localDescription.toJSON() });
          }
          return;
        }
        if (peer.signalingState !== "stable") return;
        await peer.setRemoteDescription(payload.description);
        await flushIce();
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await emitChatSocket("webrtc:answer", { call_id: payload.call_id, instance_id: instanceId,
          description: peer.localDescription.toJSON() });
      } else if (event === "webrtc:answer" && peer.signalingState === "have-local-offer") {
        await peer.setRemoteDescription(payload.description);
        await flushIce();
      }
    } catch {
      setMediaError("signaling");
    }
  }, [flushIce, instanceId]);

  const startMedia = useCallback(async (call, useAudioOnly = false) => {
    if (localStreamRef.current && callRef.current?.id === call.id) return true;
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia ||
      typeof RTCPeerConnection === "undefined") {
      setMediaError("unsupported"); return false;
    }
    callRef.current = call;
    setMediaError(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !useAudioOnly });
      if (callRef.current?.id !== call.id) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      const peer = new RTCPeerConnection({ iceServers });
      peerRef.current = peer;
      localStreamRef.current = stream;
      remoteStreamRef.current = new MediaStream();
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      stream.getTracks().forEach((track) => track.addEventListener("ended", () => {
        if (track.kind === "audio") setMicEnabled(false);
        if (track.kind === "video") setCameraEnabled(false);
      }));
      peer.ontrack = (event) => {
        const remote = remoteStreamRef.current;
        if (!remote) return;
        if (!remote.getTracks().some((track) => track.id === event.track.id)) remote.addTrack(event.track);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
          void remoteVideoRef.current.play().catch(() => setMediaError("autoplay"));
        }
      };
      peer.onicecandidate = (event) => {
        if (event.candidate && callRef.current?.id === call.id) {
          const candidate = event.candidate.toJSON();
          if (localIceRef.current.length < 40) localIceRef.current.push(candidate);
          void emitChatSocket("webrtc:ice-candidate", {
            call_id: call.id, instance_id: instanceId, candidate,
          }).catch(() => setMediaError("signaling"));
        }
      };
      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        setConnectionState(state);
        if (state === "connected") {
          setMediaError((current) => current === "signaling" ? null : current);
          void reportRef.current?.(call.id, "connected");
          if (!heartbeatRef.current) heartbeatRef.current = setInterval(() => {
            if (peer.connectionState === "connected") void reportRef.current?.(call.id, "connected");
          }, 10_000);
        } else if (state === "disconnected" || state === "failed") {
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
          void reportRef.current?.(call.id, state === "failed" ? "failed" : "disconnected");
        }
      };
      setMediaReady(true); setAudioOnly(useAudioOnly); setMicEnabled(true);
      setCameraEnabled(!useAudioOnly); setConnectionState("connecting");
      const queued = pendingSignalsRef.current.splice(0);
      for (const [event, payload] of queued) await receive(event, payload);
      return true;
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (peerRef.current) {
        peerRef.current.onicecandidate = null;
        peerRef.current.ontrack = null;
        peerRef.current.onconnectionstatechange = null;
        peerRef.current.close();
      }
      peerRef.current = null;
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      pendingIceRef.current = [];
      seenIceRef.current.clear();
      localIceRef.current = [];
      offerSentRef.current = false;
      setMediaReady(false);
      setConnectionState("idle");
      setMediaError(error?.name || "media");
      return false;
    }
  }, [receive, instanceId]);

  const startOffer = useCallback(async (call) => {
    const peer = peerRef.current;
    if (!peer || callRef.current?.id !== call.id || offerSentRef.current ||
      peer.signalingState !== "stable") return;
    offerSentRef.current = true;
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await emitChatSocket("webrtc:offer", { call_id: call.id, instance_id: instanceId,
        description: peer.localDescription.toJSON() });
    } catch {
      offerSentRef.current = false;
      setMediaError("signaling");
    }
  }, [instanceId]);

  /** Sau khi socket nối lại, gửi lại signaling hiện có mà không tạo peer hoặc media mới. */
  const resendSignaling = useCallback(async () => {
    const call = callRef.current;
    const peer = peerRef.current;
    if (!call || !peer || peer.connectionState === "connected") return;
    const description = peer.localDescription;
    if (description?.type === "offer" || description?.type === "answer") {
      try {
        await emitChatSocket(`webrtc:${description.type}`, { call_id: call.id, instance_id: instanceId,
          description: description.toJSON() });
        for (const candidate of localIceRef.current) {
          await emitChatSocket("webrtc:ice-candidate", { call_id: call.id, instance_id: instanceId, candidate });
        }
        setMediaError((current) => current === "signaling" ? null : current);
      } catch { setMediaError("signaling"); }
    }
  }, [instanceId]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  }, []);
  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }, []);
  const resumePlayback = useCallback(async () => {
    try { await remoteVideoRef.current?.play(); setMediaError(null); }
    catch { setMediaError("autoplay"); }
  }, []);

  useEffect(() => {
    if (!call || call.ended_at) { if (callRef.current) stop(); return; }
    if (callRef.current?.id && callRef.current.id !== call.id) stop();
    callRef.current = call;
  }, [call, stop]);
  useEffect(() => {
    if (!mediaReady) return;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      if (remoteStreamRef.current?.getTracks().length) {
        void remoteVideoRef.current.play().catch(() => setMediaError("autoplay"));
      }
    }
  }, [mediaReady]);
  useEffect(() => () => stop(true), [stop]);
  return { startMedia, startOffer, resendSignaling, receive, stop, localVideoRef, remoteVideoRef,
    mediaReady, mediaError, connectionState, micEnabled, cameraEnabled, audioOnly,
    toggleMic, toggleCamera, resumePlayback };
}
