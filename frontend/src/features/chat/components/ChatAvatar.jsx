import Avatar from "@/components/atoms/Avatar";

export default function ChatAvatar({ src, name, size, online = false, statusLabel }) {
  return <span className="relative inline-flex shrink-0">
    <Avatar src={src} name={name} size={size} />
    <span role="img" aria-label={statusLabel} title={statusLabel}
      className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-surface ${online ? "bg-positive" : "bg-muted-ink"}`} />
  </span>;
}
