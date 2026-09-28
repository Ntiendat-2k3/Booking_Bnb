"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


import Link from "next/link";
import { ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon, Check as CheckIcon, Sparkle as SparklesIcon, BuildingApartment, HouseLine, Bed, House, User, Users, UsersThree, Buildings, WifiHigh, CookingPot, Snowflake, Car, SwimmingPool, WashingMachine, Television, Laptop, Plant, ClipboardText, Star } from "@phosphor-icons/react";
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { becomeHost } from "@/store/authThunks";
import { useRouter } from "next/navigation";
import { notifyError, notifySuccess } from "@/lib/notify";

const STEPS = [
  {
    id: "space_type",
    questionKey: "host.spaceQuestion",
    subtitleKey: "host.spaceSubtitle",
    type: "single",
    options: [
      { value: "apartment", labelKey: "categories.apartment", icon: BuildingApartment, descKey: "host.apartmentDescription" },
      { value: "house", labelKey: "host.house", icon: HouseLine, descKey: "host.houseDescription" },
      { value: "room", labelKey: "host.privateRoom", icon: Bed, descKey: "host.privateRoomDescription" },
      { value: "unique", labelKey: "host.unique", icon: House, descKey: "host.uniqueDescription" },
    ],
  },
  {
    id: "guest_count",
    questionKey: "host.guestsQuestion",
    subtitleKey: "host.guestsSubtitle",
    type: "single",
    options: [
      { value: "1-2", labelKey: "host.oneTwo", icon: User, descKey: "host.oneTwoDescription" },
      { value: "3-4", labelKey: "host.threeFour", icon: Users, descKey: "host.threeFourDescription" },
      { value: "5-8", labelKey: "host.fiveEight", icon: UsersThree, descKey: "host.fiveEightDescription" },
      { value: "9+", labelKey: "host.ninePlus", icon: Buildings, descKey: "host.ninePlusDescription" },
    ],
  },
  {
    id: "amenities",
    questionKey: "host.amenitiesQuestion",
    subtitleKey: "host.amenitiesSubtitle",
    type: "multi",
    options: [
      { value: "wifi", labelKey: "host.wifi", icon: WifiHigh },
      { value: "kitchen", labelKey: "host.kitchen", icon: CookingPot },
      { value: "ac", labelKey: "host.ac", icon: Snowflake },
      { value: "parking", labelKey: "host.parking", icon: Car },
      { value: "pool", labelKey: "host.pool", icon: SwimmingPool },
      { value: "washer", labelKey: "host.washer", icon: WashingMachine },
      { value: "tv", labelKey: "host.tv", icon: Television },
      { value: "workspace", labelKey: "host.workspace", icon: Laptop },
    ],
  },
  {
    id: "experience",
    questionKey: "host.experienceQuestion",
    subtitleKey: "host.experienceSubtitle",
    type: "single",
    options: [
      { value: "new", labelKey: "host.new", icon: Plant, descKey: "host.newDescription" },
      { value: "some", labelKey: "host.some", icon: ClipboardText, descKey: "host.someDescription" },
      { value: "pro", labelKey: "host.pro", icon: Star, descKey: "host.proDescription" },
    ],
  },
];

const TOTAL_STEPS = STEPS.length + 1; // Bao gồm bước xác nhận.


function OptionCard({ option, selected, onClick }) {
  const t = useTranslations();
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`
        group relative w-full text-left rounded-2xl border-2 p-4 sm:p-5
        transition-all duration-200 ease-out
        ${selected
          ? "border-brand bg-brand/[0.04] shadow-md shadow-brand/10"
          : "border-line bg-surface hover:border-line hover:shadow-sm"
        }
      `}
    >

      <div className={`
        absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full
        transition-all duration-200
        ${selected
          ? "bg-brand text-white scale-100"
          : "border-2 border-line scale-90 group-hover:border-slate-400"
        }
      `}>
        {selected && <CheckIcon className="h-3.5 w-3.5" />}
      </div>

      <span className="text-2xl sm:text-3xl block mb-2"><Icon aria-hidden size={28} /></span>
      <span className="text-sm sm:text-base font-semibold text-ink block">{t(option.labelKey)}</span>
      {option.descKey && (
        <span className="text-xs sm:text-sm text-muted-ink mt-0.5 block leading-relaxed">{t(option.descKey)}</span>
      )}
    </button>
  );
}


function ProgressBar({ current, total }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="w-full h-1.5 bg-muted-surface rounded-full overflow-hidden">
      <div
        className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}


export default function HostOnboardingPage() {
  const t = useTranslations();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);


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
  }, [isConfirmation, answers, currentStep]);

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
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onConfirm() {
    setBusy(true);
    try {
      const ok = await dispatch(becomeHost());
      if (ok) {
        notifySuccess(t("host.success"));
        router.replace("/host/listings");
      } else {
        notifyError(t("auth.hostFailed"));
      }
    } catch (e) {
      notifyError(e?.message || t("auth.hostFailed"));
    } finally {
      setBusy(false);
    }
  }


  if (!isInitialized) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-ink animate-pulse">{t("common.loading")}</p>
        </div>
      </div>
    );
  }


  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="relative w-full max-w-lg mx-auto">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand/20 via-pink-200/30 to-rose-200/20 blur-2xl" />
          <div className="relative rounded-2xl border border-line/80 bg-surface p-8 shadow-lg text-center">
            <span className="text-5xl block mb-4"><HouseLine aria-hidden size={40} className="mx-auto" /></span>
            <h1 className="text-2xl font-bold text-ink">{t("host.title")}</h1>
            <p className="mt-2 text-muted-ink text-sm leading-relaxed">{t("host.loginDescription")}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-dark px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand/25 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >{t("auth.loginTitle")}</Link>
              <Link href="/" className="inline-flex items-center justify-center rounded-xl border px-6 py-3 text-sm font-semibold text-muted-ink hover:bg-muted-surface transition-all">{t("common.backHome")}</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto pb-10">

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-ink uppercase tracking-wide">
            {t("host.step", { step: step + 1, total: TOTAL_STEPS })}
          </span>
          {step > 0 && (
            <button
              onClick={goBack} disabled={busy}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-ink hover:text-slate-800 transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />{t("common.back")}</button>
          )}
        </div>
        <ProgressBar current={step} total={TOTAL_STEPS} />
      </div>


      {!isConfirmation ? (
        <div key={currentStep.id} className="animate-fadeIn">

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-ink leading-tight">
              {t(currentStep.questionKey)}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-ink">
              {t(currentStep.subtitleKey)}
            </p>
            {currentStep.type === "multi" && (
              <span className="inline-block mt-2 text-xs font-medium text-brand bg-brand/10 rounded-full px-3 py-1">{t("host.multi")}</span>
            )}
          </div>


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


          <div className="mt-8 flex justify-end">
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {isLastQuestion ? t("host.continueConfirm") : t("common.next")}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (

        <div key="confirm" className="animate-fadeIn">
          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-brand/10 via-rose-100/30 to-pink-50/20 blur-xl pointer-events-none" />
            <div className="relative rounded-2xl border border-line/80 bg-surface p-6 sm:p-8 shadow-sm">

              <div className="text-center mb-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/25 mb-4">
                  <SparklesIcon className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-ink">{t("host.ready")}</h1>
                <p className="mt-2 text-sm text-muted-ink max-w-md mx-auto leading-relaxed">{t("host.confirmDescription")}</p>
              </div>


              <div className="space-y-3 mb-8">
                {STEPS.map((s) => {
                  const val = answers[s.id];
                  if (!val) return null;
                  const display = s.type === "multi"
                    ? val.map((v) => s.options.find((o) => o.value === v)).filter(Boolean).map((o) => t(o.labelKey)).join(", ")
                    : (() => { const o = s.options.find((o) => o.value === val); return o ? t(o.labelKey) : val; })();
                  return (
                    <div key={s.id} className="flex items-start justify-between gap-4 rounded-xl bg-muted-surface border border-line px-4 py-3">
                      <span className="text-xs font-medium text-muted-ink min-w-0 flex-1">{t(s.questionKey).replace("?", "")}</span>
                      <span className="text-xs font-semibold text-muted-ink text-right">{display}</span>
                    </div>
                  );
                })}
              </div>


              <div className="flex flex-col gap-3">
                <button
                  id="btn-confirm-host"
                  onClick={onConfirm}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-dark px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t("common.processing")}</>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5" />{t("host.confirm")}</>
                  )}
                </button>
                <button
                  onClick={goBack} disabled={busy}
                  className="w-full rounded-xl border border-line bg-surface px-6 py-3.5 text-sm font-semibold text-muted-ink transition-all hover:bg-muted-surface"
                >{t("host.backEdit")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
