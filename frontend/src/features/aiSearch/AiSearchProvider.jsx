"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiFetch, setManualCsrfToken } from "@/lib/api";

const AiSearchContext = createContext(null);

/** Giữ một cuộc tìm kiếm khi khách chuyển giữa trợ lý nổi và trang kết quả đầy đủ. */
export function AiSearchProvider({ children }) {
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [result, setResult] = useState(null);
  const [criteria, setCriteria] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("idle");
  const phaseTimer = useRef(null);
  const inFlight = useRef(false);

  useEffect(() => () => window.clearTimeout(phaseTimer.current), []);

  function showPhase(next, duration) {
    window.clearTimeout(phaseTimer.current);
    setPhase(next);
    if (duration) phaseTimer.current = window.setTimeout(() => setPhase("idle"), duration);
  }

  function acknowledgeInput() {
    if (!busy) showPhase("listening", 650);
  }

  /** Phân tích câu hỏi trên server; chỉ cập nhật hội thoại sau khi nhận kết quả hợp lệ. */
  async function submit(text) {
    const query = text.trim();
    if (!query || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    showPhase("thinking");
    try {
      const csrf = await apiFetch("/api/v1/auth/csrf");
      if (csrf?.data?.csrfToken) setManualCsrfToken(csrf.data.csrfToken);
      const response = await apiFetch("/api/v1/ai-search/search", {
        method: "POST", body: { message: query, ...(criteria ? { previous: criteria } : {}) },
      });
      const next = response.data;
      setCriteria(next.criteria);
      if (next.intent === "results") setResult(next);
      else if (["clarify_budget", "needs_details"].includes(next.intent)) setResult(null);
      setConversation((current) => [...current, { role: "user", text: query }, {
        role: "assistant", reply: { intent: next.intent, amount: next.amount,
          criteria: next.criteria, count: next.items.length },
      }]);
      setMessage("");
      showPhase(next.intent === "results" ? "success" : "listening", 1300);
    } catch {
      setError("aiSearch.failed");
      showPhase("error", 1300);
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <AiSearchContext.Provider value={{ message, setMessage, conversation, result, busy, error, phase, submit, acknowledgeInput }}>
    {children}
  </AiSearchContext.Provider>;
}

export function useAiSearch() {
  const context = useContext(AiSearchContext);
  if (!context) throw new Error("useAiSearch phải được dùng trong AiSearchProvider");
  return context;
}
