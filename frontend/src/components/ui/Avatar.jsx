import Image from "next/image";

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export default function Avatar({ src, name, size = 28, className = "" }) {
  const style = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt={name || "Avatar"}
        width={size}
        height={size}
        style={style}
        className={"rounded-full border border-slate-200 object-cover bg-white " + className}
      />
    );
  }

  return (
    <div
      style={style}
      className={
        "grid place-items-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 " +
        className
      }
      aria-label={name || "Avatar"}
    >
      {initials(name)}
    </div>
  );
}
