"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { becomeHost } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import { notifyError, notifySuccess } from "@/lib/notify";

/* ─── Icons ──────────────────────────────────────────────────────── */
function ArrowLeftIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}
function ArrowRightIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
function SparklesIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

/* ─── Step Data ──────────────────────────────────────────────────── */
const STEPS = [
  {
    id: "space_type",
    question: "Bạn muốn cho thuê loại chỗ ở nào?",
    subtitle: "Chọn loại hình phù hợp nhất với không gian của bạn",
    type: "single",
    options: [
      { value: "apartment", label: "Căn hộ", emoji: "🏢", desc: "Căn hộ chung cư, studio" },
      { value: "house", label: "Nhà riêng", emoji: "🏠", desc: "Nhà phố, biệt thự" },
      { value: "room", label: "Phòng riêng", emoji: "🛏️", desc: "Phòng trong nhà bạn đang ở" },
      { value: "unique", label: "Chỗ ở độc đáo", emoji: "🏡", desc: "Homestay, bungalow, farmstay" },
    ],
  },
  {
    id: "guest_count",
    question: "Chỗ ở có thể đón bao nhiêu khách?",
    subtitle: "Số khách tối đa có thể lưu trú cùng lúc",
    type: "single",
    options: [
      { value: "1-2", label: "1 – 2 khách", emoji: "👤", desc: "Phù hợp cặp đôi, du lịch solo" },
      { value: "3-4", label: "3 – 4 khách", emoji: "👥", desc: "Nhóm bạn nhỏ, gia đình" },
      { value: "5-8", label: "5 – 8 khách", emoji: "👨‍👩‍👧‍👦", desc: "Gia đình lớn, nhóm bạn" },
      { value: "9+", label: "Trên 8 khách", emoji: "🏘️", desc: "Sự kiện, nhóm đông" },
    ],
  },
  {
    id: "amenities",
    question: "Chỗ ở của bạn có những tiện nghi nào?",
    subtitle: "Chọn tất cả những gì bạn có thể cung cấp",
    type: "multi",
    options: [
      { value: "wifi", label: "Wifi", emoji: "📶" },
      { value: "kitchen", label: "Bếp", emoji: "🍳" },
      { value: "ac", label: "Điều hoà", emoji: "❄️" },
      { value: "parking", label: "Chỗ đỗ xe", emoji: "🅿️" },
      { value: "pool", label: "Hồ bơi", emoji: "🏊" },
      { value: "washer", label: "Máy giặt", emoji: "🧺" },
      { value: "tv", label: "TV", emoji: "📺" },
      { value: "workspace", label: "Bàn làm việc", emoji: "💻" },
    ],
  },
  {
    id: "experience",
    question: "Bạn đã có kinh nghiệm cho thuê chưa?",
    subtitle: "Giúp chúng tôi hỗ trợ bạn tốt hơn",
    type: "single",
    options: [
      { value: "new", label: "Lần đầu tiên", emoji: "🌱", desc: "Chưa từng cho thuê trước đây" },
      { value: "some", label: "Có chút kinh nghiệm", emoji: "📋", desc: "Đã từng cho thuê ở nền tảng khác" },
      { value: "pro", label: "Chuyên nghiệp", emoji: "⭐", desc: "Đang quản lý nhiều chỗ ở" },
    ],
  },
];

const TOTAL_STEPS = STEPS.length + 1; // +1 for confirmation

/* ─── Option Card ────────────────────────────────────────────────── */
function OptionCard({ option, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative w-full text-left rounded-2xl border-2 p-4 sm:p-5
        transition-all duration-200 ease-out
        ${selected
          ? "border-brand bg-brand/[0.04] shadow-md shadow-brand/10"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
        }
      `}
    >
      {/* Selected indicator */}
      <div className={`
        absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full
        transition-all duration-200
        ${selected
          ? "bg-brand text-white scale-100"
          : "border-2 border-slate-300 scale-90 group-hover:border-slate-400"
        }
      `}>
        {selected && <CheckIcon className="h-3.5 w-3.5" />}
      </div>

      <span className="text-2xl sm:text-3xl block mb-2">{option.emoji}</span>
      <span className="text-sm sm:text-base font-semibold text-slate-900 block">{option.label}</span>
      {option.desc && (
        <span className="text-xs sm:text-sm text-slate-500 mt-0.5 block leading-relaxed">{option.desc}</span>
      )}
    </button>
  );
}

/* ─── Progress Bar ───────────────────────────────────────────────── */
function ProgressBar({ current, total }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-brand to-rose-400 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function HostOnboardingPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back

  useEffect(() => {
    if (isInitialized && (user?.role === "host" || user?.role === "admin")) {
      router.replace("/host/listings");
    }
  }, [isInitialized, user, router]);

  const currentStep = STEPS[step];
  const isLastQuestion = step === STEPS.length - 1;
  const isConfirmation = step === STEPS.length;

  const canProceed = useCallback(() => {
    if (isConfirmation) return true;
    const val = answers[currentStep.id];
    if (currentStep.type === "multi") return val && val.length > 0;
    return !!val;
  }, [isConfirmation, answers, currentStep, step]);

  function handleSelect(value) {
    const s = currentStep;
    if (s.type === "multi") {
      setAnswers((prev) => {
        const arr = prev[s.id] || [];
        return {
          ...prev,
          [s.id]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
        };
      });
    } else {
      setAnswers((prev) => ({ ...prev, [s.id]: value }));
    }
  }

  function goNext() {
    if (!canProceed()) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onConfirm() {
    setBusy(true);
    try {
      const ok = await dispatch(becomeHost());
      if (ok) {
        notifySuccess("Chúc mừng! Bạn đã trở thành Host 🎉");
        router.replace("/host/listings");
      }
    } catch (e) {
      notifyError(e?.message || "Không thể nâng cấp host");
    } finally {
      setBusy(false);
    }
  }

  /* ── Loading ──────────────────────────────────────────────── */
  if (!isInitialized) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 animate-pulse">Đang tải...</p>
        </div>
      </div>
    );
  }

  /* ── Not logged in ────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="relative w-full max-w-lg mx-auto">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand/20 via-pink-200/30 to-rose-200/20 blur-2xl" />
          <div className="relative rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg text-center">
            <span className="text-5xl block mb-4">🏠</span>
            <h1 className="text-2xl font-bold text-slate-900">Trở thành Host</h1>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              Bạn cần đăng nhập để bắt đầu hành trình trở thành Host.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand/25 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Đăng nhập
              </Link>
              <Link href="/" className="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Multi-step flow ──────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* ── Top bar: progress + step counter ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Bước {step + 1} / {TOTAL_STEPS}
          </span>
          {step > 0 && (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Quay lại
            </button>
          )}
        </div>
        <ProgressBar current={step} total={TOTAL_STEPS} />
      </div>

      {/* ── Question Cards ── */}
      {!isConfirmation ? (
        <div key={currentStep.id} className="animate-fadeIn">
          {/* Question header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {currentStep.question}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              {currentStep.subtitle}
            </p>
            {currentStep.type === "multi" && (
              <span className="inline-block mt-2 text-xs font-medium text-brand bg-brand/10 rounded-full px-3 py-1">
                Chọn nhiều
              </span>
            )}
          </div>

          {/* Options grid */}
          <div className={`grid gap-3 ${
            currentStep.options.length <= 4 && currentStep.type !== "multi"
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-2 sm:grid-cols-4"
          }`}>
            {currentStep.options.map((opt) => {
              const val = answers[currentStep.id];
              const selected = currentStep.type === "multi"
                ? (val || []).includes(opt.value)
                : val === opt.value;
              return (
                <OptionCard
                  key={opt.value}
                  option={opt}
                  selected={selected}
                  onClick={() => handleSelect(opt.value)}
                />
              );
            })}
          </div>

          {/* Next button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {isLastQuestion ? "Tiếp tục xác nhận" : "Tiếp theo"}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ── Confirmation Step ── */
        <div key="confirm" className="animate-fadeIn">
          <div className="relative">
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-brand/10 via-rose-100/30 to-pink-50/20 blur-xl pointer-events-none" />
            <div className="relative rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-rose-400 shadow-lg shadow-brand/25 mb-4">
                  <SparklesIcon className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Sẵn sàng trở thành Host!
                </h1>
                <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Xác nhận để nâng cấp tài khoản và bắt đầu đăng phòng của bạn trên nền tảng.
                </p>
              </div>

              {/* Summary of answers */}
              <div className="space-y-3 mb-8">
                {STEPS.map((s) => {
                  const val = answers[s.id];
                  if (!val) return null;
                  const display = s.type === "multi"
                    ? val.map((v) => s.options.find((o) => o.value === v)).filter(Boolean).map((o) => `${o.emoji} ${o.label}`).join(", ")
                    : (() => { const o = s.options.find((o) => o.value === val); return o ? `${o.emoji} ${o.label}` : val; })();
                  return (
                    <div key={s.id} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                      <span className="text-xs font-medium text-slate-400 min-w-0 shrink-0">{s.question.replace("?", "")}</span>
                      <span className="text-xs font-semibold text-slate-700 text-right">{display}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action */}
              <div className="flex flex-col gap-3">
                <button
                  id="btn-confirm-host"
                  onClick={onConfirm}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-rose-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5" />
                      Xác nhận trở thành Host
                    </>
                  )}
                </button>
                <button
                  onClick={goBack}
                  className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Quay lại chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
