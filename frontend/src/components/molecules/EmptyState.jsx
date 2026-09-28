import clsx from "clsx";

export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-muted-surface text-muted-ink">
          {icon}
        </div>
      ) : null}
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-ink">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
