import Badge from "@/components/ui/Badge";

export default function StatusBadge({ status }) {
  const tone =
    status === "published"
      ? "emerald"
      : status === "pending"
        ? "amber"
        : status === "rejected"
          ? "rose"
          : status === "paused"
            ? "slate"
            : status === "draft"
              ? "zinc"
              : "zinc";
  return <Badge tone={tone}>{status}</Badge>;
}
