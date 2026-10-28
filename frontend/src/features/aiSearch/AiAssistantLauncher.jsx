"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MASCOT_DIRECTIONS } from "./mascotAssets";

const FloatingAiAssistant = dynamic(() => import("./FloatingAiAssistant"), { ssr: false });

/** Nhường lần tải đầu cho nội dung chính; giữ widget đã tải để hội thoại không mất trạng thái khi chuyển trang. */
export default function AiAssistantLauncher() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const hidden = pathname.startsWith("/checkout/") || pathname.startsWith("/host/") ||
    ["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname);

  useEffect(() => {
    if (ready || hidden) return;
    if (window.requestIdleCallback && window.cancelIdleCallback) {
      const task = window.requestIdleCallback(() => setReady(true), { timeout: 1000 });
      return () => window.cancelIdleCallback(task);
    }
    const timer = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(timer);
  }, [ready, hidden]);

  return <>
    {!hidden && <link rel="preload" as="image" href={MASCOT_DIRECTIONS} fetchPriority="low" />}
    {ready && <FloatingAiAssistant hidden={hidden} />}
  </>;
}
