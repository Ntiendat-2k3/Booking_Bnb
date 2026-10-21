"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/atoms/Button";
import { useTranslations } from "@/i18n/LocaleProvider";
import { isTerminalCall } from "../utils/mergeCallState.mjs";

const mediaErrors = new Set(["unsupported", "NotAllowedError", "NotFoundError", "NotReadableError",
  "OverconstrainedError", "AbortError", "SecurityError", "TypeError", "signaling", "autoplay", "media"]);

/** Hiển thị call toàn cục để incoming không phụ thuộc trang tin nhắn đang mở. */
export default function CallOverlay({ session }) {
  const t = useTranslations();
  const dialogRef = useRef(null);
  const { call, userId, instanceId, busy, error, rtc, accept, decline, cancel, end,
    retryAudioOnly, dismiss } = session;
  const { localVideoRef, remoteVideoRef, mediaReady, mediaError, connectionState,
    micEnabled, cameraEnabled, audioOnly, resendSignaling, resumePlayback,
    toggleMic, toggleCamera } = rtc;
  const callId = call?.id;

  useEffect(() => {
    if (!callId) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, [callId]);
  if (!call || !userId || (call.caller_id !== userId && call.callee_id !== userId)) return null;

  const ended = isTerminalCall(call);
  const caller = call.caller_id === userId;
  const owner = caller ? call.caller_instance_id === instanceId : call.callee_instance_id === instanceId;
  const incoming = call.status === "ringing" && !caller;
  const peerName = call.peer_name || t("call.otherPerson");
  const statusKey = `call.status.${call.status}`;
  const canControlMedia = owner && !ended && call.status !== "ringing";
  const showVideo = owner && mediaReady && !ended;

  const onKeyDown = (event) => {
    if (event.key === "Escape" && ended) { dismiss(); return; }
    if (event.key !== "Tab") return;
    const buttons = [...dialogRef.current.querySelectorAll("button:not([disabled])")];
    if (!buttons.length) return;
    if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === dialogRef.current)) {
      event.preventDefault(); buttons.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
      event.preventDefault(); buttons[0].focus();
    }
  };

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
    <section ref={dialogRef} tabIndex={-1} onKeyDown={onKeyDown} role="dialog" aria-modal="true"
      aria-labelledby="call-title" aria-describedby="call-status"
      className="flex max-h-full w-full max-w-3xl flex-col overflow-y-auto rounded-2xl bg-surface p-4 text-ink shadow-2xl outline-none sm:p-6">
      <div className="mb-4">
        <h2 id="call-title" className="text-lg font-semibold sm:text-xl">{incoming ? t("call.incoming", { name: peerName }) : t("call.with", { name: peerName })}</h2>
        <p id="call-status" role="status" className="mt-1 text-sm text-muted-ink" aria-live="polite">
          {t(statusKey)}{connectionState === "disconnected" && !ended ? ` · ${t("call.reconnectingMedia")}` : ""}
        </p>
      </div>
      {showVideo ? <div className="relative aspect-video overflow-hidden rounded-xl bg-ink">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-contain" />
        <div className="absolute bottom-3 right-3 h-24 w-32 overflow-hidden rounded-lg border border-white/30 bg-black sm:h-32 sm:w-44">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>
        {connectionState !== "connected" && <p className="absolute left-3 top-3 rounded bg-black/70 px-3 py-2 text-sm text-white">{t("call.waitingMedia")}</p>}
      </div> : !ended && <div className="grid aspect-video place-items-center rounded-xl bg-muted-surface text-center text-muted-ink">
        <p className="px-4 text-sm">{incoming ? t("call.incomingHelp") :
          caller && call.status === "ringing" ? t("call.waitingAnswer") :
            owner ? t("call.waitingMedia") : t("call.activeOtherTab")}</p>
      </div>}
      {(error || mediaError) && <p role="alert" className="mt-4 text-sm text-danger">
        {t(`call.error.${mediaError && mediaErrors.has(mediaError) ? mediaError : error || "media"}`)}
      </p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {incoming && <><Button onClick={accept} loading={busy}>{t("call.accept")}</Button>
          <Button variant="danger" onClick={decline} disabled={busy}>{t("call.decline")}</Button></>}
        {caller && call.status === "ringing" && <Button variant="danger" onClick={cancel} disabled={busy}>{t("call.cancel")}</Button>}
        {owner && !ended && mediaError && !mediaReady &&
          <Button variant="secondary" onClick={retryAudioOnly} disabled={busy}>{t("call.audioOnly")}</Button>}
        {owner && !ended && mediaReady && mediaError === "signaling" &&
          <Button variant="secondary" onClick={resendSignaling}>{t("call.retryConnection")}</Button>}
        {mediaError === "autoplay" && <Button variant="secondary" onClick={resumePlayback}>{t("call.resumeAudio")}</Button>}
        {canControlMedia && mediaReady && <>
          <Button variant="secondary" onClick={toggleMic} aria-pressed={!micEnabled}>
            {t(micEnabled ? "call.mute" : "call.unmute")}</Button>
          {!audioOnly && <Button variant="secondary" onClick={toggleCamera} aria-pressed={!cameraEnabled}>
            {t(cameraEnabled ? "call.cameraOff" : "call.cameraOn")}</Button>}
        </>}
        {!ended && call.status !== "ringing" && <Button variant="danger" onClick={end} disabled={busy}>{t("call.end")}</Button>}
        {ended && <Button onClick={dismiss}>{t("call.close")}</Button>}
      </div>
    </section>
  </div>;
}
