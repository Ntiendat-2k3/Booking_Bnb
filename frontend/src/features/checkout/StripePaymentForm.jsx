"use client";

import { useMemo, useState } from "react";
import { CreditCard, LockKey } from "@phosphor-icons/react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useTheme } from "next-themes";
import Button from "@/components/atoms/Button";
import { useTranslations } from "@/i18n/LocaleProvider";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/** Chỉ Stripe Elements nhận thông tin thẻ; ứng dụng chỉ nhận trạng thái PaymentIntent. */
function PaymentFields({ bookingId, amount, onProcessing, disabled }) {
  const t = useTranslations();
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !ready || submitting || disabled) return;
    setSubmitting(true);
    setError("");
    try {
      const validation = await elements.submit();
      if (validation.error) {
        setError(validation.error.message || t("checkout.paymentFailed"));
        return;
      }
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/checkout/${bookingId}` },
        redirect: "if_required",
      });
      if (result.error) {
        setError(result.error.message || t("checkout.paymentFailed"));
      } else if (["succeeded", "processing"].includes(result.paymentIntent?.status)) {
        onProcessing();
      } else {
        setError(t("checkout.paymentFailed"));
      }
    } catch {
      setError(t("checkout.paymentFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return <form onSubmit={submit} className="space-y-5">
    <div className="rounded-xl border border-brand bg-brand/5 p-4">
      <div className="flex items-center gap-3 text-sm font-semibold text-ink">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand"><CreditCard aria-hidden size={22} /></span>
        <span>{t("checkout.stripeCard")}</span>
        <span className="ml-auto h-5 w-5 rounded-full bg-brand text-center text-xs text-on-brand">✓</span>
      </div>
    </div>
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-ink">{t("checkout.cardDetails")}</h3>
      {!ready && <p role="status" className="mb-3 text-sm text-muted-ink">{t("checkout.loadingCard")}</p>}
      <PaymentElement options={{ layout: "tabs" }} onReady={() => setReady(true)} onChange={() => setError("")} />
    </div>
    {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    <Button type="submit" disabled={!stripe || !ready || submitting || disabled} loading={submitting} size="lg" className="w-full">
      <LockKey aria-hidden size={19} />
      {submitting ? t("checkout.paymentProcessing") : t("checkout.payAmount", { amount })}
    </Button>
    <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-ink">
      <LockKey aria-hidden size={14} />{t("checkout.secureStripe")}
    </p>
  </form>;
}

export default function StripePaymentForm({ clientSecret, bookingId, amount, locale, onProcessing, disabled }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const options = useMemo(() => ({
    clientSecret,
    locale: locale === "en" ? "en" : "vi",
    appearance: {
      theme: dark ? "night" : "stripe",
      variables: {
        colorPrimary: dark ? "#b6cb95" : "#226a4f",
        colorBackground: dark ? "#1d281f" : "#fffdf8",
        colorText: dark ? "#f4f0e4" : "#1d281c",
        colorDanger: dark ? "#ff8b9a" : "#b42335",
        borderRadius: "12px",
        fontFamily: "inherit",
        spacingUnit: "5px",
      },
    },
  }), [clientSecret, dark, locale]);

  return <Elements key={clientSecret} stripe={stripePromise} options={options}>
    <PaymentFields bookingId={bookingId} amount={amount} onProcessing={onProcessing} disabled={disabled} />
  </Elements>;
}
