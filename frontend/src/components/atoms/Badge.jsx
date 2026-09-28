import clsx from "clsx";

const tones = {
  neutral: "bg-muted-surface text-muted-ink",
  brand: "bg-brand/10 text-brand-dark",
  success: "bg-positive/10 text-positive",
  warning: "bg-caution/10 text-caution",
  danger: "bg-danger/10 text-danger",
};

export default function Badge({ children, tone = "neutral", className }) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
