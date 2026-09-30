import clsx from "clsx";

export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={clsx(
        "surface-panel flex flex-col items-center px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-6 grid h-16 w-16 place-items-center rounded-panel bg-brand/10 text-brand">
          {icon}
        </div>
      ) : null}
      <h2 className="text-2xl font-bold tracking-tight text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-ink">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
