"use client";

import { User, Shield, CreditCard, Lock, Bell, GearSix as SettingsIcon } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { clsx } from "clsx";

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
    <nav className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24">
      <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 shrink-0 lg:shrink w-auto lg:w-full",
                isActive
                  ? "bg-brand text-white shadow-lg shadow-brand/10"
                  : "text-muted-ink hover:bg-muted-surface hover:text-ink"
              )}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-muted-ink"} />
              <span className="font-semibold text-sm whitespace-nowrap">{t(item.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </nav>
  );
}
