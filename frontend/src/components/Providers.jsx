"use client";

import { Provider } from "react-redux";
import { store } from "@/store/store";
import { LocaleProvider } from "@/i18n/LocaleProvider";

// Giữ snapshot SSR ban đầu dù bootstrap đã cập nhật store trước khi các vùng streaming hydrate.
const serverState = store.getState();

export default function Providers({ locale, messages, children }) {
  return (
    <Provider store={store} serverState={serverState}>
      <LocaleProvider locale={locale} messages={messages}>
        {children}
      </LocaleProvider>
    </Provider>
  );
}
