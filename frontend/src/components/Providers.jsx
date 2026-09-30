"use client";

import { Provider } from "react-redux";
import { store } from "@/store/store";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";
import { DEFAULT_THEME } from "@/lib/constants";

// Giữ snapshot SSR ban đầu dù bootstrap đã cập nhật store trước khi các vùng streaming hydrate.
const serverState = store.getState();

export default function Providers({ locale, messages, children }) {
  const { resolvedTheme } = useTheme();
  return (
    <Provider store={store} serverState={serverState}>
      <LocaleProvider locale={locale} messages={messages}>
        <Toaster theme={resolvedTheme || DEFAULT_THEME} richColors position="top-right" />
        {children}
      </LocaleProvider>
    </Provider>
  );
}
