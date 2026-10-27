"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiFetch, setManualCsrfToken } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleProvider";

const AiSearchContext = createContext(null);

/** Soạn phản hồi từ ý định và tiêu chí đã được backend xác thực; không suy diễn phòng hay giá. */
function assistantReply(response, locale) {
  const english = locale === "en";
  if (response.intent === "greeting") return english
    ? "Hi! I can help you find a place by city, guests, budget, amenities and travel dates. Where are you headed?"
    : "Chào bạn 👋 Mình giúp tìm chỗ ở theo thành phố, số khách, ngân sách, tiện nghi và ngày đi. Bạn định đến đâu?";
  if (response.intent === "help") return english
    ? "You can ask me to find a place, then refine the city, budget, amenities or dates in your next message. For example: a place in Hanoi for two under 600,000 VND a night."
    : "Bạn có thể nhờ mình tìm phòng rồi nhắn tiếp để đổi thành phố, ngân sách, tiện nghi hoặc ngày đi. Ví dụ: “Tìm phòng ở Hà Nội cho 2 người dưới 600 nghìn/đêm”.";
  if (response.intent === "clarify_budget") return english
    ? `When you say “${response.amount}”, what currency amount per night do you mean? For example, “${response.amount} thousand VND per night”.`
    : `Mình chưa rõ “${response.amount}” là bao nhiêu đồng mỗi đêm. Bạn cho mình thêm đơn vị nhé, ví dụ “${response.amount} nghìn/đêm”.`;
  if (response.intent === "needs_details") return english
    ? "Tell me a little about your stay, such as the city, number of guests or nightly budget, and I'll look for suitable places."
    : "Bạn kể mình thêm nơi muốn đến, số khách hoặc ngân sách mỗi đêm nhé. Mình sẽ tìm phòng phù hợp cho bạn.";

  const city = response.criteria.city;
  const price = response.criteria.max_price;
  const where = city ? (english ? ` in ${city}` : ` ở ${city}`) : "";
  const budget = price ? (english
    ? ` under ${new Intl.NumberFormat("en-US").format(price)} VND/night`
    : ` dưới ${new Intl.NumberFormat("vi-VN").format(price)}đ/đêm`) : "";
  if (!response.items.length) return english
    ? `I couldn't find a place${where}${budget} in the current listings. Would you like to try a higher budget or a different area?`
    : `Mình chưa thấy phòng${where}${budget} trong dữ liệu hiện có. Bạn muốn thử tăng ngân sách hoặc đổi khu vực không?`;
  const count = response.items.length;
  const nextStep = response.criteria.check_in
    ? (english ? "Open a place to see details and book." : "Bạn mở phòng ưng ý để xem chi tiết và đặt nhé.")
    : (english ? "Share your check-in and check-out dates so I can verify availability and stay prices." : "Cho mình ngày nhận và trả phòng để kiểm tra lịch trống cùng giá kỳ ở nhé.");
  return english
    ? `I found ${count} place${count === 1 ? "" : "s"}${where}${budget}. ${nextStep}`
    : `Mình gợi ý ${count} phòng${where}${budget}. ${nextStep}`;
}

/** Giữ một cuộc tìm kiếm khi khách chuyển giữa trợ lý nổi và trang kết quả đầy đủ. */
export function AiSearchProvider({ children }) {
  const { locale } = useLocale();
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
        role: "assistant", text: assistantReply(next, locale),
      }]);
      setMessage("");
      showPhase(next.intent === "results" ? "success" : "listening", 1300);
    } catch (requestError) {
      setError(requestError.message || (locale === "en" ? "Search failed" : "Không thể tìm phòng lúc này"));
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
