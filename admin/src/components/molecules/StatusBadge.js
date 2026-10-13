import Badge from "@/components/atoms/Badge";
import { useTranslations } from "@/i18n/LocaleProvider";

export default function StatusBadge({ status }) {
  const t = useTranslations();
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
  return <Badge tone={tone}>{t(`statuses.${status}`)}</Badge>;
}
