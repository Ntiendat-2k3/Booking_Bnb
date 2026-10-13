"use client";

import { useTranslations } from "@/i18n/LocaleProvider";

const RipleLoading = () => {
  const t = useTranslations();
  return (
    <div className="flex min-h-[45dvh] w-full flex-col items-center justify-center gap-4 px-6 app-bg" role="status" aria-label={t("common.loading")}>
      <span className="admin-overline">Booking BnB {t("nav.adminConsole")}</span>
      <div className="admin-loading-line" aria-hidden="true" />
      <span className="text-sm ui-muted">{t("common.loading")}</span>
    </div>
  );
};

export default RipleLoading;
