"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { CalendarPlus, Camera, ImageSquare, Microphone, PaperPlaneRight, Plus, Smiley, ThumbsUp } from "@phosphor-icons/react";
import IconButton from "@/components/atoms/IconButton";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useVoiceRecording } from "../hooks/useVoiceRecording";
import EmojiText from "./EmojiText";

const EmojiPicker = dynamic(() => import("./EmojiPicker"), { ssr: false });

export default function MessageComposer({ onSend, replyTo, replyName, onClearReply,
  canSupportBooking = false, onSupportBooking, disabled = false }) {
  const t = useTranslations();
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [sending, setSending] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const voice = useVoiceRecording();
  const textareaRef = useRef(null);
  const emojiPanelRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const morePanelRef = useRef(null);
  const moreButtonRef = useRef(null);
  const imageInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraGenerationRef = useRef(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!emojiOpen && !moreOpen) return;
    const onPointerDown = (event) => {
      if (emojiOpen && !emojiPanelRef.current?.contains(event.target) &&
        !emojiButtonRef.current?.contains(event.target)) setEmojiOpen(false);
      if (moreOpen && !morePanelRef.current?.contains(event.target) &&
        !moreButtonRef.current?.contains(event.target)) setMoreOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (emojiOpen) { setEmojiOpen(false); emojiButtonRef.current?.focus(); }
        if (moreOpen) { setMoreOpen(false); moreButtonRef.current?.focus(); }
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [emojiOpen, moreOpen]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    cameraGenerationRef.current++;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
  }, []);

  useEffect(() => {
    if (cameraStatus === "ready" && videoRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraStatus]);

  const clearImage = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setSelectedImage(null);
  };

  /** Dừng luồng camera và vô hiệu hóa các yêu cầu cấp quyền hoặc chụp ảnh còn chờ. */
  const closeCamera = () => {
    cameraGenerationRef.current++;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
  };

  /** Xin quyền camera từ thao tác người dùng và giữ luồng cho đến khi chụp hoặc hủy. */
  const openCamera = async () => {
    if (cameraStatus !== "idle" || disabled || sending) return;
    setMoreOpen(false); setEmojiOpen(false); setMediaError(null);
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMediaError("cameraUnsupported"); return;
    }
    const generation = ++cameraGenerationRef.current;
    setCameraStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
      if (generation !== cameraGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setCameraStatus("ready");
    } catch (cause) {
      if (generation !== cameraGenerationRef.current) return;
      const errors = {
        NotAllowedError: "cameraDenied",
        NotFoundError: "cameraNotFound",
        NotReadableError: "cameraBusy",
        SecurityError: "cameraBlocked",
      };
      setMediaError(errors[cause?.name] || "cameraStart");
      setCameraStatus("idle");
    }
  };

  /** Tạo tệp ảnh từ khung hình đang xem để dùng chung luồng xem trước và gửi ảnh. */
  const capturePhoto = () => {
    const video = videoRef.current;
    if (cameraStatus !== "ready" || !video?.videoWidth || !video.videoHeight) {
      setMediaError("cameraCapture"); return;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1920 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context || !canvas.toBlob) { setMediaError("cameraCapture"); return; }
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch {
      setMediaError("cameraCapture"); return;
    }
    const generation = cameraGenerationRef.current;
    setCameraStatus("capturing");
    canvas.toBlob((blob) => {
      if (generation !== cameraGenerationRef.current) return;
      closeCamera();
      if (!blob) { setMediaError("cameraCapture"); return; }
      setImageDraft(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  const insertEmoji = (emoji) => {
    const native = emoji?.native;
    if (!native || text.length + native.length > 4000) return;
    const input = textareaRef.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    setText((current) => current.slice(0, start) + native + current.slice(end));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + native.length, start + native.length);
    });
  };

  const submit = async (event) => {
    event?.preventDefault();
    if (disabled || sending || cameraStatus !== "idle" || voice.status === "recording" || voice.status === "requesting") return;
    const file = selectedImage || voice.file;
    if (file) {
      setSending(true);
      try {
        const sent = await onSend({ type: selectedImage ? "image" : "audio", file, replyTo });
        if (sent) { clearImage(); voice.cancel(); setMediaError(null); }
      } finally { setSending(false); }
      return;
    }
    const body = text.trim();
    if (!body || body.length > 4000) return;
    setText("");
    setEmojiOpen(false);
    await onSend({ body, replyTo });
  };

  const setImageDraft = (file) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size >= 10 * 1024 * 1024) {
      setMediaError("invalidImage"); return;
    }
    voice.cancel(); clearImage();
    previewUrlRef.current = URL.createObjectURL(file);
    setPreviewUrl(previewUrlRef.current);
    setSelectedImage(file); setMediaError(null); setMoreOpen(false); setEmojiOpen(false);
  };
  const selectImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) setImageDraft(file);
  };
  const toggleRecording = () => {
    setMoreOpen(false); setEmojiOpen(false); clearImage(); setMediaError(null);
    if (voice.status === "recording") voice.stop();
    else void voice.start();
  };
  const quickReaction = async () => {
    if (disabled || sending || cameraStatus !== "idle" || voice.status === "recording" || voice.status === "requesting") return;
    setSending(true);
    try { await onSend({ body: "\u{1F44D}", replyTo }); }
    finally { setSending(false); }
  };
  const toolClass = "!h-9 !w-9 !border-0 !bg-transparent !text-brand";
  return <form onSubmit={submit} className="relative border-t border-line bg-surface px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-3">
    <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp"
      onChange={selectImage} hidden aria-label={t("chat.addImage")} />
    {replyTo && <div className="mb-2 flex min-w-0 items-center gap-2 rounded-xl border-l-2 border-brand bg-muted-surface px-3 py-2 text-xs">
      <div className="min-w-0 flex-1"><strong className="block text-brand">{t("chat.replyingTo", { name: replyName })}</strong>
        <span className="block truncate text-muted-ink"><EmojiText text={replyTo.body || t(replyTo.type === "image" ? "chat.sentImage" : replyTo.type === "audio" ? "chat.voiceMessage" : replyTo.type === "video" ? "chat.shared.video" : replyTo.type === "file" ? "chat.sentFiles" : replyTo.type === "shared_context" ? "chat.sharedListing" : "chat.replyUnavailable")} /></span></div>
      <button type="button" onClick={onClearReply} className="font-semibold text-brand underline">{t("chat.cancelReply")}</button>
    </div>}
    {(selectedImage || voice.file || voice.status === "recording" || voice.status === "requesting") &&
      <div className="mb-2 flex min-w-0 items-center gap-3 rounded-xl bg-muted-surface p-2 text-sm text-ink">
        {selectedImage && <><span className="truncate">{selectedImage.name}</span>
          {previewUrl && <Image src={previewUrl} alt={t("chat.imagePreview")} unoptimized width={48} height={48}
            className="h-12 w-12 rounded object-cover" />}</>}
        {voice.status === "recording" && <span role="status">{t("chat.recording")} {Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, "0")}</span>}
        {voice.status === "requesting" && <span role="status">{t("chat.microphonePermission")}</span>}
        {voice.file && <><span>{t("chat.voiceReady")}</span>
          {voice.url && <audio controls src={voice.url} aria-label={t("chat.voicePreview")} className="min-w-0 max-w-full" />}</>}
        {text.trim() && <span className="text-xs text-muted-ink">{t("chat.textKept")}</span>}
        {voice.status === "recording" && <button type="button" onClick={voice.stop} className="ml-auto font-semibold text-brand underline">{t("chat.stopRecording")}</button>}
        <button type="button" onClick={() => { clearImage(); voice.cancel(); }}
          className="ml-auto font-semibold text-danger underline">{t("chat.removeMedia")}</button>
      </div>}
    {(mediaError || voice.error) && <p role="alert" className="mb-2 text-sm text-danger">
      {t(`chat.mediaError.${mediaError || voice.error}`)}
    </p>}
    {cameraStatus !== "idle" && <section aria-label={t("chat.cameraPreview")}
      className="mb-2 rounded-xl bg-muted-surface p-2">
      {cameraStatus === "requesting" && <p role="status" className="py-4 text-center text-sm text-muted-ink">{t("chat.cameraPermission")}</p>}
      <video ref={videoRef} autoPlay muted playsInline aria-label={t("chat.cameraPreview")}
        className={`max-h-[45dvh] w-full rounded-lg bg-black object-contain ${cameraStatus === "requesting" ? "hidden" : ""}`} />
      <div className="mt-2 flex justify-end gap-3 text-sm font-semibold">
        <button type="button" onClick={() => { closeCamera(); setMediaError(null); }} className="px-2 py-1 text-muted-ink">{t("chat.cancelPhoto")}</button>
        {cameraStatus !== "requesting" && <button type="button" onClick={capturePhoto} disabled={cameraStatus !== "ready"}
          className="rounded-lg bg-brand px-3 py-1.5 text-on-brand disabled:opacity-50">{t("chat.capturePhoto")}</button>}
      </div>
    </section>}
    <div className="flex min-w-0 items-end gap-1 sm:gap-2">
      <div className="flex shrink-0 items-center gap-0.5 pb-1">
        <IconButton ref={moreButtonRef} label={t("chat.addMore")} aria-expanded={moreOpen}
          aria-controls="chat-more-actions" onClick={() => { setEmojiOpen(false); setMoreOpen((open) => !open); }}
          disabled={disabled || sending || cameraStatus !== "idle" || voice.status === "requesting"}
          className={toolClass}><Plus aria-hidden size={22} weight="bold" /></IconButton>
        <IconButton label={t("chat.addPhoto")} onClick={() => void openCamera()}
          disabled={disabled || sending || cameraStatus !== "idle" || voice.status === "recording" || voice.status === "requesting"} className={`${toolClass} max-[359px]:hidden`}><Camera aria-hidden size={22} weight="fill" /></IconButton>
        <IconButton label={t("chat.addImage")} onClick={() => imageInputRef.current?.click()}
          disabled={disabled || sending || cameraStatus !== "idle" || voice.status === "recording"} className={toolClass}><ImageSquare aria-hidden size={22} weight="fill" /></IconButton>
        <IconButton label={voice.status === "recording" ? t("chat.stopRecording") : t("chat.voiceMessage")}
          onClick={toggleRecording} disabled={disabled || sending || cameraStatus !== "idle" || voice.status === "requesting"}
          className={`${toolClass} max-[359px]:hidden`}><Microphone aria-hidden size={22} weight="fill" /></IconButton>
      </div>
      <div className="flex min-w-0 flex-1 items-end rounded-[1.5rem] bg-muted-surface px-3">
        <label htmlFor="chat-message" className="sr-only">{t("chat.writeMessage")}</label>
        <textarea ref={textareaRef} id="chat-message" rows={1} maxLength={4000} value={text} onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }}
          placeholder={t("chat.writeMessage")} disabled={disabled || Boolean(selectedImage || voice.file)}
          className="max-h-36 min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 pr-1 text-base text-ink outline-none placeholder:text-muted-ink focus:outline-none focus:ring-0 focus-visible:outline-none" />
        <IconButton ref={emojiButtonRef} label={t("chat.chooseEmoji")} aria-expanded={emojiOpen} aria-controls="chat-emoji-picker"
          disabled={disabled || Boolean(selectedImage || voice.file)}
          onClick={() => setEmojiOpen((open) => !open)} className={`${toolClass} mb-1 shrink-0`}>
          <Smiley aria-hidden size={23} weight="fill" />
        </IconButton>
      </div>
      {text.trim() || selectedImage || voice.file ? <IconButton type="submit" label={t("chat.send")}
        disabled={disabled || sending || cameraStatus !== "idle" || voice.status === "recording" || voice.status === "requesting"}
        className="!h-11 !w-11 !border-0 !bg-transparent !text-brand">
        <PaperPlaneRight aria-hidden size={25} weight="fill" />
      </IconButton> : <IconButton label={t("chat.quickReaction")} onClick={() => void quickReaction()}
        disabled={disabled || sending || cameraStatus !== "idle" || voice.status === "recording" || voice.status === "requesting"}
        className="!h-11 !w-11 !border-0 !bg-transparent !text-brand">
        <ThumbsUp aria-hidden size={25} weight="fill" />
      </IconButton>}
    </div>
    {moreOpen && <div ref={morePanelRef} id="chat-more-actions"
      className="absolute bottom-full left-2 z-20 mb-2 flex min-w-40 flex-col rounded-xl border border-line bg-surface p-1 shadow-float">
      <button type="button" disabled={sending || cameraStatus !== "idle" || voice.status === "recording" || voice.status === "requesting"} onClick={() => void openCamera()} className="rounded-lg px-3 py-2 text-left hover:bg-muted-surface disabled:opacity-50">{t("chat.addPhoto")}</button>
      <button type="button" disabled={sending || cameraStatus !== "idle" || voice.status === "recording"} onClick={() => { setMoreOpen(false); imageInputRef.current?.click(); }} className="rounded-lg px-3 py-2 text-left hover:bg-muted-surface disabled:opacity-50">{t("chat.addImage")}</button>
      <button type="button" disabled={sending || cameraStatus !== "idle"} onClick={toggleRecording} className="rounded-lg px-3 py-2 text-left hover:bg-muted-surface disabled:opacity-50">{t(voice.status === "recording" ? "chat.stopRecording" : "chat.voiceMessage")}</button>
      {canSupportBooking && !disabled && <button type="button"
        disabled={sending || cameraStatus !== "idle" || voice.status === "recording" || voice.status === "requesting"}
        onClick={() => { setMoreOpen(false); onSupportBooking(); }}
        className="flex items-center gap-2 border-t border-line px-3 py-2 text-left font-semibold text-brand hover:bg-muted-surface disabled:opacity-50">
        <CalendarPlus aria-hidden size={18} />{t("chat.proposal.support")}</button>}
    </div>}
    {emojiOpen && <div ref={emojiPanelRef} id="chat-emoji-picker" className="absolute bottom-full right-2 z-20 mb-2 max-h-[55dvh] max-w-[calc(100vw-1rem)] overflow-auto rounded-xl shadow-float sm:right-16">
      <EmojiPicker onEmojiSelect={insertEmoji} />
    </div>}
  </form>;
}
