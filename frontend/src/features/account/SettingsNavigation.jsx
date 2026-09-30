"use client";

import { User, Shield, CreditCard, Lock, Bell, GearSix as SettingsIcon } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

const getMenuItems = (role) => {
  const items = [
    { id: "profile", labelKey: "account.profile", icon: User },
    { id: "security", labelKey: "account.security", icon: Lock },
    { id: "payment", labelKey: "account.payments", icon: CreditCard },
    { id: "privacy", labelKey: "account.privacy", icon: Shield },
    { id: "notifications", labelKey: "account.notifications", icon: Bell },
    { id: "preferences", labelKey: "account.preferences", icon: SettingsIcon },
  ];

  return items;
};

export default function SettingsNavigation({ activeTab, onTabChange, role }) {
  const t = useTranslations();
  const menuItems = getMenuItems(role);
  return (
    <nav aria-label={t("account.title")} className="w-full shrink-0 lg:sticky lg:top-28 lg:w-64">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              variant={isActive ? "ink" : "ghost"}
              className="shrink-0 justify-start gap-3 lg:w-full"
            >
              <Icon aria-hidden size={18} />
              <span className="font-semibold text-sm whitespace-nowrap">{t(item.labelKey)}</span>
            </Button>
          )
        })}
      </div>
    </nav>
  );
}
