"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 60;
const MAX_BYTES = 10 * 1024 * 1024;
const formats = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

/** Chỉ giữ micro khi đang ghi âm; tệp nháp chưa được gửi cho đến khi người dùng xác nhận. */
export function useVoiceRecording() {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const urlRef = useRef(null);
  const generationRef = useRef(0);
  const [status, setStatus] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  const release = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const clearDraft = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setUrl(null);
    setFile(null);
  }, []);

  const cancel = useCallback(() => {
    generationRef.current++;
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state === "recording") recorder.stop();
    }
    release();
    clearDraft(); setSeconds(0); setError(null); setStatus("idle");
  }, [clearDraft, release]);

  const start = useCallback(async () => {
    if (status === "requesting" || status === "recording") return;
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined") {
      setError("unsupported"); return;
    }
    const generation = ++generationRef.current;
    clearDraft(); setSeconds(0); setError(null); setStatus("requesting");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = formats.find((format) => MediaRecorder.isTypeSupported?.(format));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const mime = recorder.mimeType.split(";")[0];
      if (!["audio/webm", "audio/ogg", "audio/mp4"].includes(mime)) throw new Error("unsupported");
      recorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        if (generation !== generationRef.current) return;
        generationRef.current++;
        recorder.onstop = null;
        if (recorder.state === "recording") recorder.stop();
        release(); setError("recording"); setStatus("idle");
      };
      recorder.onstop = () => {
        release();
        if (generation !== generationRef.current) return;
        const blob = new Blob(chunks, { type: mime });
        if (!blob.size || blob.size > MAX_BYTES) {
          setError(blob.size ? "tooLarge" : "recording"); setStatus("idle"); return;
        }
        const extension = mime === "audio/mp4" ? "m4a" : mime.split("/")[1];
        const draft = new File([blob], `voice-message.${extension}`, { type: mime });
        urlRef.current = URL.createObjectURL(draft);
        setUrl(urlRef.current);
        setFile(draft);
        setStatus("ready");
      };
      recorder.start(1000);
      setStatus("recording");
      timerRef.current = setInterval(() => setSeconds((value) => {
        if (value + 1 >= MAX_SECONDS) stop();
        return Math.min(value + 1, MAX_SECONDS);
      }), 1000);
    } catch (cause) {
      if (generation !== generationRef.current) return;
      generationRef.current++;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        if (recorder.state === "recording") recorder.stop();
      }
      stream?.getTracks().forEach((track) => track.stop());
      release();
      const known = ["NotAllowedError", "NotFoundError", "NotReadableError", "SecurityError", "AbortError"];
      setError(cause.message === "unsupported" ? "unsupported" :
        known.includes(cause.name) ? cause.name : "recording");
      setStatus("idle");
    }
  }, [clearDraft, release, status, stop]);

  useEffect(() => () => {
    generationRef.current++;
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state === "recording") recorder.stop();
    }
    release();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, [release]);

  return { status, seconds, file, url, error, start, stop, cancel };
}
