"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


import Button from "@/components/atoms/Button";
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
        group relative w-full rounded-panel border-2 p-5 text-left sm:p-6
        transition duration-200 ease-out focus-visible:ring-4 focus-visible:ring-brand/20
        ${selected
          ? "border-ink bg-muted-surface shadow-soft"
          : "border-line bg-surface hover:border-ink/30"
        }
      `}
    >

      <div className={`
        absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full
        transition-all duration-200
        ${selected
          ? "bg-ink text-on-ink scale-100"
          : "border-2 border-line scale-90 group-hover:border-ink/40"
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
          <div className="surface-panel p-8 text-center">
            <span className="text-5xl block mb-4"><HouseLine aria-hidden size={40} className="mx-auto" /></span>
            <h1 className="page-heading">{t("host.title")}</h1>
            <p className="mt-2 text-muted-ink text-sm leading-relaxed">{t("host.loginDescription")}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button href="/login">{t("auth.loginTitle")}</Button>
              <Button href="/" variant="secondary">{t("common.backHome")}</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-3xl pb-10 sm:pt-4">

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-ink uppercase tracking-wide">
            {t("host.step", { step: step + 1, total: TOTAL_STEPS })}
          </span>
          {step > 0 && (
            <Button
              onClick={goBack} disabled={busy}
              variant="ghost" size="sm"
            >
              <ArrowLeftIcon aria-hidden className="h-3.5 w-3.5" />{t("common.back")}</Button>
          )}
        </div>
        <ProgressBar current={step} total={TOTAL_STEPS} />
      </div>


      {!isConfirmation ? (
        <div key={currentStep.id} className="animate-fadeIn">

          <div className="mb-6">
            <h1 className="page-heading">
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
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              variant="ink" size="lg"
            >
              {isLastQuestion ? t("host.continueConfirm") : t("common.next")}
              <ArrowRightIcon aria-hidden className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (

        <div key="confirm" className="animate-fadeIn">
          <div className="relative">
            <div className="surface-panel p-6 sm:p-8">

              <div className="text-center mb-8">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-control bg-ink">
                  <SparklesIcon className="h-8 w-8 text-on-ink" />
                </div>
                <h1 className="page-heading">{t("host.ready")}</h1>
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
                <Button
                  id="btn-confirm-host"
                  onClick={onConfirm}
                  loading={busy} size="lg" className="w-full"
                >
                  {busy ? (
                    <>
                      {t("common.processing")}</>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5" />{t("host.confirm")}</>
                  )}
                </Button>
                <Button
                  onClick={goBack} disabled={busy}
                  variant="secondary" className="w-full"
                >{t("host.backEdit")}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
